import { useEffect, useMemo, useState } from "react";
import { Plus, Mail, Calendar, Filter, UserCheck, UserX } from "lucide-react";
import Modal from "../../reusable-components/Modal";
import Button from "../../reusable-components/Button";
import SearchInput from "../../reusable-components/SearchInput";
import UserAvatar from "../../reusable-components/UserAvatar";
import { useCustomQuery } from "../../../hooks/useQuery";
import { API_ENDPOINTS } from "../../../utils/constants";
import { formatDateTimeSimple } from "../../../utils/formatDateTime";
import { useTranslation } from "react-i18next";
import { useCustomPost } from "../../../hooks/useMutation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import handleErrorAlerts from "../../../utils/showErrorMessages";

interface CourseUser {
  id: string;
  email: string;
  progress: number | null;
  full_name: string;
  enrolled_at: string;
  last_active: null | string;
  profile_image: string;
}

type EmailForm = { email: string };

const SEARCH_PARAM = "search";

export default function UserManagement({ courseId }: { courseId: string }) {
  const { t, i18n } = useTranslation("courseBuilder");
  const queryClient = useQueryClient();

  // --- search with debounce ---
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Build the list URL with ?search=
  const usersUrl =
    `${API_ENDPOINTS.courseUsers}${courseId}/` + // ensure trailing slash for DRF
    (debouncedSearch
      ? `?${SEARCH_PARAM}=${encodeURIComponent(debouncedSearch)}`
      : "");

  const usersQueryKey = ["course-users", courseId, debouncedSearch];

  const { data, isLoading } = useCustomQuery(
    usersUrl,
    usersQueryKey,
    undefined,
    !!courseId
  );
  const users: CourseUser[] = useMemo(() => data?.data?.students ?? [], [data]);

  // The table currently doesn't use status filtering logic – keep as-is visually
  const filteredUsers = useMemo(() => users, [users]);

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // ---- ADD user form ----
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd, isSubmitting: isSubmittingAdd },
    setValue: setAddValue,
  } = useForm<EmailForm>({ defaultValues: { email: "" } });

  // IMPORTANT: trailing slash to avoid 301 -> GET
  const { mutateAsync: addUser } = useCustomPost(
    `${API_ENDPOINTS.addCourseUser}${courseId}/`
  );

  const onSubmitAdd = async (form: EmailForm) => {
    try {
      const res = await addUser({ email: form.email.trim() });
      // some backends return {status:true}, others 2xx – handle both
      if (res?.status === true || res) {
        toast.success(t("userManagement.added"));
        setIsAddUserModalOpen(false);
        resetAdd({ email: "" });
        queryClient.invalidateQueries({ queryKey: usersQueryKey });
      }
    } catch (error: any) {
      handleErrorAlerts(
        error?.response?.data?.detail || error?.response?.data?.error.email[0]
      );
    }
  };

  // ---- REMOVE user (POST with { email }) ----
  const {
    handleSubmit: handleSubmitRemove,
    setValue: setRemoveValue,
    formState: { isSubmitting: isSubmittingRemove },
  } = useForm<EmailForm>({ defaultValues: { email: "" } });

  // IMPORTANT: trailing slash to avoid 301 -> GET
  const { mutateAsync: removeUser } = useCustomPost(
    `${API_ENDPOINTS.removeCourseUser}${courseId}/`
  );

  const handleRemoveUser = (email: string) => {
    setRemoveValue("email", email, { shouldValidate: true });
    void handleSubmitRemove(async (form) => {
      try {
        await removeUser({ email: form.email.trim() });
        toast.success(t("userManagement.removed"));
        queryClient.invalidateQueries({ queryKey: usersQueryKey });
      } catch (error: any) {
        handleErrorAlerts(
          error?.response?.data?.detail || error?.response?.data?.error.email[0]
        );
      }
    })();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: {
        color: "bg-green-100 text-green-800",
        label: t("userManagement.active"),
      },
      inactive: {
        color: "bg-yellow-100 text-yellow-800",
        label: t("userManagement.inactive"),
      },
      completed: {
        color: "bg-blue-100 text-blue-800",
        label: t("userManagement.completed"),
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t("userManagement.CourseUsers")}
            </h2>
            <p className="text-gray-600 mt-1">
              {filteredUsers.length} {t("userManagement.of")} {users.length}{" "}
              {t("userManagement.users")}
            </p>
          </div>
          <Button
            onClick={() => {
              setIsAddUserModalOpen(true);
              setAddValue("email", "");
            }}
            icon={Plus}
            variant="primary"
          >
            {t("userManagement.addUser")}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("userManagement.searchByNameEmail")}
            className="flex-1"
          />

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">{t("userManagement.allStatus")}</option>
              <option value="active">{t("userManagement.active")}</option>
              <option value="inactive">{t("userManagement.inactive")}</option>
              <option value="completed">{t("userManagement.completed")}</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("userManagement.user")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("userManagement.progress")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("userManagement.status")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("userManagement.enrolled")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("userManagement.lastActive")}
                  </th>
                  <th className="px-6 py-3 rtl:text-left ltr:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("userManagement.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user?.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserAvatar
                          name={user?.full_name}
                          avatar={user?.profile_image}
                        />
                        <div className="ltr:ml-4 rtl:mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user?.full_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                            {user?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 ltr:mr-3 rtl:ml-3">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${user?.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {user?.progress ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge("active")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Calendar className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                        {formatDateTimeSimple(user?.enrolled_at ?? new Date(), {
                          locale: i18n.language,
                          t,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user?.last_active ?? ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap rtl:text-left ltr:text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRemoveUser(user?.email)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title={t("userManagement.removeUser")}
                          disabled={isSubmittingRemove}
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("userManagement.noUsers")}
              </h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== "all"
                  ? t("userManagement.noUsersMatch")
                  : t("userManagement.noUsersGet")}
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title={t("userManagement.addUserToCourse")}
      >
        <form onSubmit={handleSubmitAdd(onSubmitAdd)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("userManagement.userEmail")}*
            </label>
            <input
              type="email"
              {...registerAdd("email", {
                required: t("userManagement.emailRequired") as string,
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
                  message: t("userManagement.emailInvalid") as string,
                },
              })}
              placeholder={t("userManagement.enterUserEmailAddress")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {!!errorsAdd.email && (
              <p className="text-sm text-red-600 mt-1">
                {errorsAdd.email.message}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {t("userManagement.invitationEmailMessage")}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setIsAddUserModalOpen(false)}
              variant="secondary"
              type="button"
            >
              {t("userManagement.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingAdd || isLoading}
              variant="primary"
            >
              {isSubmittingAdd
                ? t("userManagement.adding")
                : t("userManagement.addUser")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
