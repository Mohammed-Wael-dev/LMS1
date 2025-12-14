import { useState } from "react";
import { Plus, Users, Trash2, UserPlus, UserMinus } from "lucide-react";
import Button from "../../reusable-components/Button";
import SearchInput from "../../reusable-components/SearchInput";
import UserAvatar from "../../reusable-components/UserAvatar";
import Modal from "../../reusable-components/Modal";
import { useTranslation } from "react-i18next";
import { useCustomQuery } from "../../../hooks/useQuery";
import { API_ENDPOINTS } from "../../../utils/constants";
import { useCustomPost } from "../../../hooks/useMutation";
import { useParams } from "react-router";
import handleErrorAlerts from "../../../utils/showErrorMessages";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  members: User[];
  createdAt: string;
}

export default function GroupManagement() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("courseBuilder");
  const { courseId } = useParams();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isManageMembersModalOpen, setIsManageMembersModalOpen] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // GET Rooms
  const { data: rooms } = useCustomQuery(
    `${API_ENDPOINTS.rooms}?course_id=${courseId}${
      searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
    }`,
    ["rooms", courseId, searchQuery],
    undefined,
    !!courseId
  );
  const roomsData = rooms?.data || [];
  // Create Room
  const { mutateAsync: createRoom } = useCustomPost(API_ENDPOINTS.createRoom, [
    "create-rooms",
  ]);
  // GET Available Users
  const { data: availableUsers } = useCustomQuery(
    API_ENDPOINTS.users +
      "/?group_id=" +
      selectedGroup?.id +
      "&not_in_group=true" +
      "&page_size=9999" +
      "&search=" +
      memberSearchQuery,
    ["available-users", selectedGroup?.id, memberSearchQuery],
    undefined,
    !!isManageMembersModalOpen
  );
  const availableUsersData = availableUsers?.data || [];
  // GET Current Members
  const { data: currentMembers } = useCustomQuery(
    API_ENDPOINTS.users +
      "/?group_id=" +
      selectedGroup?.id +
      "&not_in_group=false" +
      "&page_size=9999" +
      "&search=" +
      memberSearchQuery,
    ["current-members", selectedGroup?.id, memberSearchQuery],
    undefined,
    !!isManageMembersModalOpen
  );
  const currentMembersData = currentMembers?.data || [];
  console.log(currentMembersData);
  // Add User To Room
  const { mutateAsync: addUserToRoom } = useCustomPost(
    `${API_ENDPOINTS.rooms}${selectedGroup?.id}/add-user/`,
    ["add-user-to-room"]
  );
  // Remove User From Room
  const { mutateAsync: removeUserFromRoom } = useCustomPost(
    `${API_ENDPOINTS.rooms}${selectedGroup?.id}/remove-user/`,
    ["remove-user-from-room"]
  );
  const [groups, setGroups] = useState<Group[]>([
    {
      id: "1",
      name: "Frontend Developers",
      description: "Students focusing on React and frontend technologies",
      color: "bg-blue-500",
      members: [
        { id: "1", name: "John Doe", email: "john.doe@example.com" },
        { id: "2", name: "Jane Smith", email: "jane.smith@example.com" },
      ],
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Backend Engineers",
      description: "Students working on server-side development",
      color: "bg-green-500",
      members: [
        { id: "3", name: "Mike Johnson", email: "mike.johnson@example.com" },
      ],
      createdAt: "2024-01-20",
    },
  ]);

  // const [availableUsers] = useState<User[]>([
  //   { id: "1", name: "John Doe", email: "john.doe@example.com" },
  //   { id: "2", name: "Jane Smith", email: "jane.smith@example.com" },
  //   { id: "3", name: "Mike Johnson", email: "mike.johnson@example.com" },
  //   { id: "4", name: "Sarah Wilson", email: "sarah.wilson@example.com" },
  //   { id: "5", name: "Alex Brown", email: "alex.brown@example.com" },
  // ]);

  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    color: "bg-blue-500",
  });

  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  const handleCreateGroup = async () => {
    try {
      if (!newGroup.name.trim()) return;
      const payload = {
        name: newGroup.name,
        description: newGroup.description,
        color: newGroup.color.split("-")[1],
        course: courseId,
      };
      await createRoom(payload);
      queryClient.invalidateQueries({ queryKey: ["rooms", courseId] });
      setNewGroup({ name: "", description: "", color: "bg-blue-500" });
      toast.success(t("groupManagement.groupCreatedSuccess"));
    } catch (error: any) {
      handleErrorAlerts(error?.response?.data?.error);
    }
    setIsCreateGroupModalOpen(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    try {
      // await deleteRoom({ room_id: groupId });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success(t("groupManagement.groupDeletedSuccess"));
    } catch (error: any) {
      handleErrorAlerts(error?.response?.data?.error);
    }
    if (window.confirm(t("groupManagement.confirmDelete"))) {
      setGroups(groups.filter((group) => group.id !== groupId));
    }
  };

  const handleAddMemberToGroup = async (userId: string) => {
    if (!selectedGroup) return;
    try {
      await addUserToRoom({ user_id: userId });
      queryClient.invalidateQueries({ queryKey: ["available-users"] });
      queryClient.invalidateQueries({ queryKey: ["current-members"] });
      toast.success("the User has been added to the group successfully");
    } catch (error: any) {
      handleErrorAlerts(error?.response?.data?.error);
    }
  };

  const handleRemoveMemberFromGroup = async (userId: string) => {
    try {
      await removeUserFromRoom({ user_id: userId });
      queryClient.invalidateQueries({ queryKey: ["available-users"] });
      queryClient.invalidateQueries({ queryKey: ["current-members"] });
      toast.success("the User has been removed from the group successfully");
    } catch (error: any) {
      handleErrorAlerts(error?.response?.data?.error);
    }
  };

  const getAvailableUsersForGroup = () => {
    if (!selectedGroup) return availableUsers;

    const memberIds = selectedGroup?.members?.map((member) => member.id);
    return availableUsersData?.filter(
      (user: any) =>
        !memberIds?.includes(user?.id) &&
        (user?.name
          ?.toLowerCase()
          ?.includes(memberSearchQuery?.toLowerCase()) ||
          user?.email
            ?.toLowerCase()
            ?.includes(memberSearchQuery?.toLowerCase()))
    );
  };

  const getGroupMembers = () => {
    if (!selectedGroup) return [];

    return currentMembersData?.filter(
      (member: any) =>
        member?.name
          .toLowerCase()
          ?.includes(memberSearchQuery?.toLowerCase()) ||
        member?.email?.toLowerCase()?.includes(memberSearchQuery?.toLowerCase())
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t("groupManagement.studyGroups")}
            </h2>
            <p className="text-gray-600 mt-1">
              {t("groupManagement.groupsCreated", { count: rooms?.count })}
            </p>
          </div>
          <Button
            onClick={() => setIsCreateGroupModalOpen(true)}
            icon={Plus}
            variant="primary"
          >
            {t("groupManagement.createGroup")}
          </Button>
        </div>

        {/* Search */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("groupManagement.searchGroups")}
          className="max-w-md"
        />

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomsData?.map((group: any) => (
            <div
              key={group?.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div
                    className={`w-4 h-4 rounded-full ${group?.color} ltr:mr-3 rtl:ml-3`}
                  />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {group?.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedGroup(group);
                      setIsManageMembersModalOpen(true);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Manage members"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4">
                {group?.description || "-"}
              </p>

              <div className="flex flex-wrap items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                  <span>
                    {group?.participants_count} {t("groupManagement.members")}
                    {/* {group?.participants_count !== 1 ? "s" : ""} */}
                  </span>
                </div>
                <div className="text-xs text-gray-400 flex gap-1">
                  <p>{t("groupManagement.created")}</p>
                  <p dir="rtl">{new Date(group.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Member Avatars */}
              {group?.members?.length > 0 && (
                <div className="mt-4 flex -space-x-2">
                  {group.members.slice(0, 5).map((member: any) => (
                    <UserAvatar
                      key={member.id}
                      name={member.name}
                      avatar={member.avatar}
                      size="sm"
                      className="border-2 border-white"
                    />
                  ))}
                  {group.members.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                      +{group.members.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {roomsData?.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("groupManagement.noGroupsFound")}
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? t("groupManagement.tryAdjustingSearch")
                : t("groupManagement.createFirstGroup")}
            </p>
          </div>
        )}
      </div>
      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        title={t("groupManagement.createStudyGroup")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("groupManagement.groupName")} *
            </label>
            <input
              type="text"
              value={newGroup.name}
              onChange={(e) =>
                setNewGroup({ ...newGroup, name: e.target.value })
              }
              placeholder={t("groupManagement.enterGroupName")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("groupManagement.description")}
            </label>
            <textarea
              value={newGroup.description}
              onChange={(e) =>
                setNewGroup({ ...newGroup, description: e.target.value })
              }
              placeholder={t("groupManagement.describePurpose")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("groupManagement.groupColor")}
            </label>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewGroup({ ...newGroup, color })}
                  className={`w-8 h-8 rounded-full ${color} ${
                    newGroup.color === color
                      ? "ring-2 ring-offset-2 ring-gray-400"
                      : ""
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setIsCreateGroupModalOpen(false)}
              variant="secondary"
            >
              {t("groupManagement.cancel")}
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroup.name.trim()}
              variant="primary"
            >
              {t("groupManagement.createGroup")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Members Modal */}
      <Modal
        isOpen={isManageMembersModalOpen}
        onClose={() => setIsManageMembersModalOpen(false)}
        title={t("groupManagement.manageMembersTitle", {
          groupName: selectedGroup?.name,
        })}
        size="lg"
      >
        <div className="space-y-6">
          <SearchInput
            value={memberSearchQuery}
            onChange={setMemberSearchQuery}
            placeholder={t("groupManagement.searchUsers")}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Members */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {t("groupManagement.currentMembers", {
                  count: currentMembers?.count || 0,
                })}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getGroupMembers()?.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <UserAvatar
                        name={member.name}
                        avatar={member.avatar}
                        size="sm"
                      />
                      <div className="ltr:ml-3 rtl:mr-3">
                        <div className="text-sm font-medium text-gray-900">
                          {member.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMemberFromGroup(member.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title={t("groupManagement.removeFromGroup")}
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {getGroupMembers()?.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    {memberSearchQuery
                      ? t("groupManagement.noMembersMatch")
                      : t("groupManagement.noMembersInGroup")}
                  </p>
                )}
              </div>
            </div>

            {/* Available Users */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {t("groupManagement.availableUsers", {
                  count: getAvailableUsersForGroup()?.length,
                })}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getAvailableUsersForGroup()?.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <UserAvatar
                        name={user.name}
                        avatar={user.avatar}
                        size="sm"
                      />
                      <div className="ltr:ml-3 rtl:mr-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddMemberToGroup(user.id)}
                      className="text-green-600 hover:text-green-800 p-1"
                      title={t("groupManagement.addToGroup")}
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {getAvailableUsersForGroup()?.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    {memberSearchQuery
                      ? t("groupManagement.noUsersMatch")
                      : t("groupManagement.allUsersInGroup")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setIsManageMembersModalOpen(false)}
              variant="primary"
            >
              {t("groupManagement.done")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
