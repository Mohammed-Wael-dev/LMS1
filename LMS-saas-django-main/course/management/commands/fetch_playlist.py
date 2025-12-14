import requests
import re
import json
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django_tenants.utils import tenant_context
from tenant.models import Client  # replace with your tenant model
from course.models import Course, Lesson, Section
from account.models import User


def extract_json(name, text):
    """Extract JSON object embedded in JavaScript variable"""
    m = re.search(rf"{name}\s*=\s*({{.*?}});", text, re.DOTALL)
    return json.loads(m.group(1)) if m else None


def fetch_html(url, params):
    """Fetch a webpage with headers that mimic a browser"""
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
    }
    r = requests.get(url, params=params, headers=headers, timeout=30)
    r.raise_for_status()
    return r.text


def duration_to_hours(duration_str):
    """
    Convert YouTube duration string ("HH:MM:SS" or "MM:SS") to hours (float).
    """
    if not duration_str:
        return 0
    parts = [int(p) for p in duration_str.split(":")]
    if len(parts) == 3:  # HH:MM:SS
        h, m, s = parts
    elif len(parts) == 2:  # MM:SS
        h = 0
        m, s = parts
    else:
        return 0
    return h + m / 60 + s / 3600


class Command(BaseCommand):
    help = "Fetch a YouTube playlist and save it to the DB for a specific tenant."

    def add_arguments(self, parser):
        parser.add_argument("playlist_id", type=str, help="YouTube Playlist ID")
        parser.add_argument("tenant_schema", type=str, help="Tenant schema name")

    def handle(self, *args, **options):
        playlist_id = options["playlist_id"]
        tenant_schema = options["tenant_schema"]

        # Get the tenant
        tenant = Client.objects.get(schema_name=tenant_schema)

        with tenant_context(tenant):
            # --- Fetch playlist page ---
            html = fetch_html("https://www.youtube.com/playlist", {"list": playlist_id, "hl": "en"})
            idata = extract_json("ytInitialData", html)
            if not idata:
                self.stderr.write("❌ Could not extract ytInitialData")
                return

            # --- Extract videos list ---
            try:
                pl_contents = (
                    idata["contents"]["twoColumnBrowseResultsRenderer"]["tabs"][0]["tabRenderer"]["content"]
                    ["sectionListRenderer"]["contents"][0]["itemSectionRenderer"]["contents"][0]
                    ["playlistVideoListRenderer"]["contents"]
                )
            except KeyError:
                self.stderr.write("❌ JSON structure changed; cannot find playlist videos")
                return

            # --- Extract channel name (instructor) ---
            try:
                owner_renderer = idata["sidebar"]["playlistSidebarRenderer"]["items"][1][
                    "playlistSidebarSecondaryInfoRenderer"
                ]["videoOwner"]["videoOwnerRenderer"]

                channel_name = owner_renderer["title"]["runs"][0]["text"]
                channel_thumbnail = owner_renderer["thumbnail"]["thumbnails"][-1]["url"]

            except KeyError:
                channel_name = "Unknown Channel"
                channel_thumbnail = None


            safe_email = f"{channel_name.replace(' ', '').lower()[:50]}@example.com"

            instructor, created = User.objects.get_or_create(
                first_name=channel_name.split(" ")[0],
                last_name=channel_name.split(" ")[1] if len(channel_name.split(" ")) > 1 else "",
                email=safe_email,
                defaults={"is_instructor": True},
            )

            if channel_thumbnail and created:
                try:
                    img_data = requests.get(channel_thumbnail, timeout=20).content
                    instructor.profile_image.save(
                        f"instructor-{instructor.id}.jpg",
                        ContentFile(img_data),
                        save=True,
                    )
                except Exception:
                    self.stderr.write("⚠️ Failed to download instructor profile image")

            # --- Extract playlist title ---
            try:
                sidebar = idata["sidebar"]["playlistSidebarRenderer"]["items"][0]["playlistSidebarPrimaryInfoRenderer"]
                playlist_title = sidebar["title"]["runs"][0]["text"]
            except KeyError:
                playlist_title = f"Playlist {playlist_id}"  # fallback

            # --- Create course ---
            course, _ = Course.objects.get_or_create(
                title=playlist_title.strip(),
                instructor=instructor,
                defaults={"price": 0, "is_published": True},
            )

            # --- Save thumbnail ---
            try:
                thumb_url = f"https://i.ytimg.com/vi/{pl_contents[0]['playlistVideoRenderer']['videoId']}/maxresdefault.jpg"
                img_data = requests.get(thumb_url, timeout=20).content
                course.picture.save(f"playlist-{playlist_id}.jpg", ContentFile(img_data), save=True)
            except Exception:
                self.stderr.write("⚠️ Failed to download thumbnail")

            course.description = f"Imported from YouTube playlist ({playlist_id})"
            course.save()

            # --- Create section ---
            section, _ = Section.objects.get_or_create(
                course=course,
                title="YouTube Playlist Videos",
                order=0,
            )

            # --- Create lessons ---
            for idx, item in enumerate(pl_contents, start=1):
                v = item.get("playlistVideoRenderer")
                if not v:
                    continue

                video_id = v.get("videoId")
                duration_str = v.get("lengthText", {}).get("simpleText")
                duration = duration_to_hours(duration_str)
                title = v.get("title", {}).get("runs", [{}])[0].get("text")

                Lesson.objects.get_or_create(
                    section=section,
                    title=title,
                    defaults={
                        "duration_hours": duration,
                        "url": f"https://www.youtube.com/watch?v={video_id}",
                        "order": idx,
                    },
                )

            self.stdout.write(
                self.style.SUCCESS(f"✅ Playlist '{playlist_title}' imported successfully for tenant '{tenant_schema}'.")
            )
