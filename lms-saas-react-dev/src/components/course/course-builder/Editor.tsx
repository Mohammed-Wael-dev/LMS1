import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { normalizeHtmlForEditor } from "../../../utils/normalizeHTML";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Quote,
  Code,
  SquareDashedBottomCode,
  List,
  ListOrdered,
  ListChecks,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Redo2,
  Undo2,
  Highlighter,
  ChevronDown,
  SuperscriptIcon,
  SubscriptIcon,
} from "lucide-react";

export type SimpleEditorHandle = {
  getHTML: () => string;
  setHTML: (html: string) => void;
  focus: () => void;
};

type Props = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  /** return URL after uploading a File (e.g. POST -> returns CDN URL). If not provided, we’ll embed base64. */
  onUploadImage?: (file: File) => Promise<string>;
  /** "light" | "dark" | "system" (default: system) */
  mode?: "light" | "dark" | "system";
};

const lowlight = createLowlight(common);
const SimpleEditor = forwardRef<SimpleEditorHandle, Props>(
  (
    {
      value = "",
      onChange,
      placeholder = "Write something…",
      className = "",
      minHeight = 320,
      onUploadImage,
    },
    ref
  ) => {
    const [showHeadings, setShowHeadings] = useState(false);
    const [showLists, setShowLists] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const linkInputRef = useRef<HTMLInputElement>(null);

    const extensions = useMemo(
      () => [
        StarterKit.configure({
          codeBlock: false,
          dropcursor: false,
          gapcursor: false,
        }),
        // allow parsing <img src="data:..."> from HTML
        Image.configure({ allowBase64: true }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: { class: "text-purple-600 underline" },
        }),
        Underline,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Highlight,
        Superscript,
        Subscript,
        TaskList,
        TaskItem.configure({ nested: true }),
        CodeBlockLowlight.configure({ lowlight }),
        Placeholder.configure({ placeholder }),
      ],
      [placeholder]
    );

    const uniqueExtensions = useMemo(
      () => Array.from(new Map(extensions.map((e) => [e.name, e])).values()),
      [extensions]
    );

    const editor = useEditor({
      extensions: uniqueExtensions,
      content: normalizeHtmlForEditor(value),
      autofocus: false,
      editorProps: {
        attributes: {
          class: [
            // Typography & containment like simple template, with dark mode
            "prose prose-sm sm:prose-base max-w-none focus:outline-none",
            // force black markers (bullets & ol)
            "prose-ul:marker:text-black prose-ol:marker:text-black",
          ].join(" "),
        },
        handleDrop: (_view, e, _slice, moved) => {
          if (moved) return false;
          const files = Array.from((e as DragEvent).dataTransfer?.files || []);
          if (!files.length) return false;
          e.preventDefault();
          void insertImages(files);
          return true;
        },
        handlePaste: (_view, event) => {
          const dt = event.clipboardData;
          const files = Array.from(dt?.files || []);
          if (files.length) {
            void insertImages(files);
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    });

    // image helper
    const insertImages = async (files: File[]) => {
      for (const f of files) {
        if (!/^image\//.test(f.type)) continue;
        let src = "";
        if (onUploadImage) {
          src = await onUploadImage(f);
        } else {
          // base64 fallback
          src = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(String(reader.result));
            reader.onerror = () => rej(new Error("read failed"));
            reader.readAsDataURL(f);
          });
        }
        editor?.chain().focus().setImage({ src }).run();
      }
    };

    // sync external value
    useEffect(() => {
      if (!editor) return;
      const html = normalizeHtmlForEditor(value);
      if (html !== editor.getHTML()) {
        editor.commands.setContent(html, { emitUpdate: false });
      }
    }, [value, editor]);

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() ?? "",
      setHTML: (html: string) =>
        editor?.commands.setContent(html, { emitUpdate: false }),
      focus: () => editor?.chain().focus().run(),
    }));

    const Btn = ({
      onClick,
      active,
      title,
      disabled,
      children,
    }: React.PropsWithChildren<{
      onClick: () => void;
      active?: boolean;
      title?: string;
      disabled?: boolean;
    }>) => (
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={onClick}
        className={`p-2 rounded-md hover:bg-gray-100 disabled:opacity-40 ${
          active ? "bg-gray-100" : ""
        }`}
      >
        {children}
      </button>
    );

    if (!editor) return null;

    const applyHeading = (level?: 1 | 2 | 3 | 4) => {
      editor.chain().focus();
      if (!level) editor.chain().focus().setParagraph().run();
      else editor.chain().focus().toggleHeading({ level }).run();
      setShowHeadings(false);
    };

    const openLinkDialog = () => {
      setLinkOpen(true);
      setTimeout(() => linkInputRef.current?.focus(), 0);
    };

    const submitLink = () => {
      const url = linkInputRef.current?.value?.trim();
      if (!url) {
        setLinkOpen(false);
        return;
      }
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
      setLinkOpen(false);
    };

    const containerClasses = [
      "w-full mx-auto overflow-hidden",
      "rounded-2xl shadow-sm ring-1 ring-gray-200",
      "sm:max-w-[860px]",
      className || "",
    ].join(" ");

    return (
      <div className={containerClasses}>
        {/* Toolbar */}
        <div className={`sticky top-0 z-10 border-b bg-white`}>
          <div className="flex flex-wrap items-center gap-1 px-2 py-2">
            {/* Undo/Redo */}
            <Btn
              title="Undo"
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo2 className="w-4 h-4" />
            </Btn>
            <Btn
              title="Redo"
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo2 className="w-4 h-4" />
            </Btn>

            <div className="w-px h-5 mx-1 bg-gray-200" />

            {/* Headings dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHeadings((s) => !s)}
                className="px-2 py-1.5 rounded-md border text-sm flex items-center bg-white border-gray-200"
                title="Headings"
              >
                {editor.isActive("heading", { level: 1 }) ? (
                  <>
                    H<sub>1</sub>
                  </>
                ) : editor.isActive("heading", { level: 2 }) ? (
                  <>
                    H<sub>2</sub>
                  </>
                ) : editor.isActive("heading", { level: 3 }) ? (
                  <>
                    H<sub>3</sub>
                  </>
                ) : editor.isActive("heading", { level: 4 }) ? (
                  <>
                    H<sub>4</sub>
                  </>
                ) : (
                  "P"
                )}
                <ChevronDown className="w-2 h-2 ltr:ml-1 rtl:mr-1" />
              </button>
              {showHeadings && (
                <div className="absolute z-20 mt-1 w-44 rounded-lg border shadow-sm bg-white border-gray-200">
                  {[
                    { label: "Paragraph", level: undefined },
                    { label: "H1 Heading 1", level: 1 },
                    { label: "H2 Heading 2", level: 2 },
                    { label: "H3 Heading 3", level: 3 },
                    { label: "H4 Heading 4", level: 4 },
                  ].map((h) => (
                    <button
                      key={String(h.level ?? "p")}
                      onClick={() => applyHeading(h.level as any)}
                      className="w-full ltr:text-left rtl:text-right px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inline styles */}
            <Btn
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="w-4 h-4" />
            </Btn>
            <Btn
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="w-4 h-4" />
            </Btn>
            <Btn
              title="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="w-4 h-4" />
            </Btn>
            <Btn
              title="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="w-4 h-4" />
            </Btn>
            <Btn
              title="Highlight"
              active={editor.isActive("highlight")}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="w-4 h-4" />
            </Btn>
            <Btn
              title="Superscript"
              active={editor.isActive("superscript")}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
            >
              <SuperscriptIcon className="w-4 h-4" />
            </Btn>
            <Btn
              title="Subscript"
              active={editor.isActive("subscript")}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
            >
              <SubscriptIcon className="w-4 h-4" />
            </Btn>

            <div className="w-px h-5 mx-1 bg-gray-200" />

            {/* Lists dropdown */}
            <div className="relative">
              <Btn onClick={() => setShowLists((s) => !s)} title="Lists">
                <ListChecks className="w-4 h-4" />
              </Btn>
              {showLists && (
                <div className="absolute z-20 mt-1 w-44 rounded-lg border shadow-sm bg-white border-gray-200">
                  <button
                    onClick={() =>
                      editor.chain().focus().toggleBulletList().run()
                    }
                    className="w-full ltr:text-left rtl:text-right px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                  >
                    <List className="w-4 h-4" /> Bullet list
                  </button>
                  <button
                    onClick={() =>
                      editor.chain().focus().toggleOrderedList().run()
                    }
                    className="w-full ltr:text-left rtl:text-right px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                  >
                    <ListOrdered className="w-4 h-4" /> Ordered list
                  </button>
                  <button
                    onClick={() =>
                      editor.chain().focus().toggleTaskList().run()
                    }
                    className="w-full ltr:text-left rtl:text-right px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                  >
                    <ListChecks className="w-4 h-4" /> Task list
                  </button>
                </div>
              )}
            </div>

            {/* Block & align */}
            <Btn
              title="Blockquote"
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="w-4 h-4" />
            </Btn>
            <Btn
              title="Inline code"
              active={editor.isActive("code")}
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <Code className="w-4 h-4" />
            </Btn>
            <Btn
              title="Code block"
              active={editor.isActive("codeBlock")}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <SquareDashedBottomCode className="w-4 h-4" />
            </Btn>
            <Btn
              title="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="w-4 h-4" />
            </Btn>
            <Btn
              title="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
            >
              <AlignCenter className="w-4 h-4" />
            </Btn>
            <Btn
              title="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight className="w-4 h-4" />
            </Btn>

            <div className="w-px h-5 mx-1 bg-gray-200" />

            {/* Link + Image + HR */}
            <Btn title="Add link" onClick={openLinkDialog}>
              <LinkIcon className="w-4 h-4" />
            </Btn>

            {/* Hidden file input for image upload */}
            <label className="p-2 rounded-md hover:bg-gray-100 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) void insertImages(files);
                  e.currentTarget.value = "";
                }}
              />
              <ImageIcon className="w-4 h-4" />
            </label>

            <Btn
              title="Horizontal rule"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="w-4 h-4" />
            </Btn>
          </div>
        </div>

        {/* Link popup */}
        {linkOpen && (
          <div className="p-3 border-b bg-white border-gray-200">
            <div className="flex gap-2">
              <input
                ref={linkInputRef}
                type="url"
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 rounded-md border bg-white border-gray-300"
                defaultValue={
                  editor.getAttributes("link")?.href
                    ? String(editor.getAttributes("link").href)
                    : ""
                }
              />
              <button
                onClick={submitLink}
                className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700"
              >
                Add
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setLinkOpen(false);
                }}
                className="px-3 py-2 rounded-md border bg-white border-gray-200"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="px-4 sm:px-6 py-4">
          <div style={{ minHeight }} className="rounded-lg">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    );
  }
);

SimpleEditor.displayName = "SimpleEditor";
export default SimpleEditor;
