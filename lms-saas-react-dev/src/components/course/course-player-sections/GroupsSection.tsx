import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCustomQuery } from "../../../hooks/useQuery";
import { useCustomPost } from "../../../hooks/useMutation";
import { API_ENDPOINTS } from "../../../utils/constants";
import { useParams } from "react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface GroupsProps {
  setGroupsCount: React.Dispatch<React.SetStateAction<number | undefined>>;
  handleShowChat: any;
}

export default function GroupsSection({
  setGroupsCount,
  handleShowChat,
}: GroupsProps) {
  const { courseId } = useParams();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState("");
  // GET Rooms
  const { data: rooms } = useCustomQuery(
    API_ENDPOINTS.rooms + "?course_id=" + courseId,
    ["rooms"]
  );
  const courseRooms = rooms?.data || [];
  setGroupsCount(courseRooms?.length);
  console.log("Course Rooms:", courseRooms);
  // Join Room
  const { mutateAsync: joinRoom } = useCustomPost(
    API_ENDPOINTS.joinAndLeaveRoom + selectedGroup + "/join/",
    ["join-room"]
  );
  // Leave Room
  const { mutateAsync: leaveRoom } = useCustomPost(
    API_ENDPOINTS.joinAndLeaveRoom + selectedGroup + "/leave/",
    ["leave-room"]
  );
  const { t } = useTranslation("coursePlayer");

  const handleJoinRoom = async (groupId: string) => {
    setSelectedGroup(groupId);
    try {
      await joinRoom({});
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    } catch (error) {
      console.error("Error joining room:", error);
    }
  };

  const handleLeaveRoom = async (groupId: string) => {
    setSelectedGroup(groupId);
    try {
      await leaveRoom({});
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {t("groupsSection.title")}
        </h3>
        <p className="text-gray-300 text-sm mb-6">
          {t("groupsSection.subtitle")}
        </p>

        {/* Groups List */}
        <div className="space-y-4">
          {courseRooms?.map((group: any) => (
            <div key={group?.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded-full ltr:mr-3 rtl:ml-3"
                    style={{ backgroundColor: group?.color }}
                  />
                  <div>
                    <h4 className="font-semibold text-white">{group?.name}</h4>
                    <p className="text-gray-300 text-sm">
                      {group?.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {t(
                      group?.participants_count === 1
                        ? "groupsSection.members_one"
                        : "groupsSection.members_other",
                      { count: group?.participants_count ?? 0 }
                    )}
                  </span>
                  {group?.is_joined ? (
                    <button
                      onClick={() => handleLeaveRoom(group?.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                    >
                      {t("groupsSection.leave")}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoinRoom(group?.id)}
                      className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 transition-colors"
                    >
                      {t("groupsSection.join")}
                    </button>
                  )}
                </div>
              </div>

              {/* Group Members */}
              {group?.participants && group.participants.length > 0 && (
                <div className="flex items-center mb-3">
                  <span className="text-gray-400 text-sm ltr:mr-3 rtl:ml-3">
                    {t("groupsSection.membersLabel")}
                  </span>
                  <div className="flex -gap-2">
                    {group.participants.slice(0, 5).map((participant: any) => (
                      <div key={participant?.id} className="relative">
                        {participant?.profile_image ? (
                          <img
                            src={participant.profile_image}
                            alt={participant?.name ?? ""}
                            className="w-6 h-6 rounded-full border-2 border-gray-700"
                            title={participant?.name ?? ""}
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full border-2 border-gray-700 bg-gray-500 flex items-center justify-center text-xs text-white"
                            title={participant?.name ?? ""}
                          >
                            {participant?.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                        )}
                      </div>
                    ))}
                    {(group?.participants_count ?? 0) > 5 && (
                      <div className="w-6 h-6 rounded-full bg-gray-600 border-2 border-gray-700 flex items-center justify-center text-xs text-white">
                        +{(group.participants_count ?? 0) - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Messages */}
              <div className="border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">
                    {t("groupsSection.recentDiscussion")}
                  </span>
                  <button
                    onClick={() => handleShowChat(group)}
                    className="text-purple-400 hover:text-purple-300 text-xs"
                  >
                    {t("groupsSection.showChat")}
                  </button>
                </div>

                {group?.last_two_messages &&
                group.last_two_messages.length > 0 ? (
                  <div className="space-y-2">
                    {group.last_two_messages.map((message: any) => (
                      <div key={message?.id} className="flex items-start gap-2">
                        {message?.sender?.profile_image ? (
                          <img
                            src={message.sender.profile_image}
                            alt={message?.sender?.name ?? ""}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center text-xs text-white">
                            {message?.sender?.name?.charAt(0)?.toUpperCase() ??
                              "?"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">
                              {message?.sender?.name ?? ""}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {message?.created_at ?? ""}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm">
                            {message?.content ?? ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">
                    {t("groupsSection.noMessages")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {(!courseRooms || courseRooms.length === 0) && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">
              {t("groupsSection.emptyTitle")}
            </h4>
            <p className="text-gray-400">{t("groupsSection.emptySubtitle")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
