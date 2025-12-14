// src/components/course/builder/CourseInformationForm.tsx
import { Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { useCustomQuery } from "../../../hooks/useQuery";
import { API_ENDPOINTS } from "../../../utils/constants";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCustomPatch } from "../../../hooks/useMutation";
import handleErrorAlerts from "../../../utils/showErrorMessages";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import FeatureGate from "../../settings/FeatureGate";

type FormValues = {
  title: string;
  description: string;
  price: number | "";
  sub_category: string;
  category: string;
  level: string;
  picture: string;
};

interface Props {
  course: Course;
}

export default function CourseInformationForm({ course }: Props) {
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const { t } = useTranslation("courseBuilder");
  const isHydratingRef = useRef(true);

  const { data: categoriesData } = useCustomQuery(API_ENDPOINTS.categories, [
    "categories",
  ]);
  const categories: Category[] = categoriesData?.data || [];

  const {
    reset,
    setValue,
    watch,
    setError,
    register,
    getValues,
    formState: { dirtyFields },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      level: "beginner",
      picture: "",
      price: "",
      sub_category: "",
      category: "",
    },
  });

  // Dependent Sub-categories
  const selectedCategory = watch("category");
  const { data: subCategoriesData, isLoading: subCatsLoading } = useCustomQuery(
    `${API_ENDPOINTS.subCategories}?category=${selectedCategory}`,
    ["sub-categories", selectedCategory],
    undefined,
    !!selectedCategory
  );
  const subCategories: SubCategory[] = useMemo(
    () => subCategoriesData?.data || [],
    [subCategoriesData]
  );

  const { data: allSubCategoriesData } = useCustomQuery(
    API_ENDPOINTS.subCategories,
    ["all-sub-categories"]
  );
  const allSubCategories: SubCategory[] = useMemo(
    () => allSubCategoriesData?.data || [],
    [allSubCategoriesData]
  );

  // When category changes, clear sub_category (only if invalid for category)
  useEffect(() => {
    if (isHydratingRef.current) return; // ← guard
    if (!selectedCategory || !dirtyFields?.category) return;

    const currentSub = getValues("sub_category");
    const currentSubObj = allSubCategories.find((sc) => sc.id === currentSub);
    if (!currentSubObj || currentSubObj.category !== selectedCategory) {
      setValue("sub_category", "", { shouldDirty: true });
    }
  }, [
    selectedCategory,
    dirtyFields?.category,
    allSubCategories,
    getValues,
    setValue,
  ]);

  // PATCH
  const { mutateAsync: updateCourse } = useCustomPatch(
    `${API_ENDPOINTS.updateCourse}${course?.id}/`,
    ["course", course?.id]
  );

  const rehydrateFromServer = (serverCourse?: any) => {
    if (!serverCourse) return;
    const updated: Partial<FormValues> = {
      title: serverCourse?.title ?? getValues("title"),
      description: serverCourse?.description ?? getValues("description"),
      level: serverCourse?.level ?? getValues("level"),
      price:
        typeof serverCourse?.price === "number"
          ? serverCourse?.price
          : getValues("price"),
      sub_category:
        serverCourse?.sub_category_id ??
        serverCourse?.sub_category ??
        getValues("sub_category"),
      picture:
        serverCourse?.picture_url ??
        serverCourse?.picture ??
        getValues("picture"),
      category: getValues("category"),
    };
    reset(updated, { keepDirtyValues: true });
  };

  const saveField = async (name: keyof FormValues) => {
    if (name === "category") return;
    if (dirtyFields && !dirtyFields[name]) return;

    const value = getValues(name);
    const fd = new FormData();

    switch (name) {
      case "title":
      case "description":
      case "level":
      case "sub_category":
        if (value !== "" && value !== undefined && value !== null) {
          fd.append(name, String(value));
        } else {
          return;
        }
        break;

      case "price": {
        const num =
          typeof value === "number" ? value : parseFloat(String(value ?? ""));
        if (Number.isNaN(num) || num < 0) {
          setError(
            "price",
            { message: t("courseInfo.priceError") },
            { shouldFocus: true }
          );
          return;
        }
        fd.append("price", String(num));
        break;
      }

      default:
        return;
    }

    try {
      const res = await updateCourse(fd);
      const ok =
        res?.status === true || res?.status === 200 || res?.ok === true;
      if (!ok) {
        const payload = res?.data?.error || res?.error;
        if (payload) handleErrorAlerts(payload);
        throw new Error(t("courseInfo.error"));
      }
      const serverCourse = res?.data?.data || res?.data || res?.result?.data;
      rehydrateFromServer(serverCourse);
      toast.success(t("courseInfo.success"));
    } catch (error: any) {
      const payload = error?.response?.data?.error;
      if (payload) handleErrorAlerts(payload);
      else toast.error(error?.message || t("courseInfo.error"));
    }
  };

  const savePicture = async (file: File) => {
    const fd = new FormData();
    fd.append("picture", file);

    try {
      const res = await updateCourse(fd);
      const ok =
        res?.status === true || res?.status === 200 || res?.ok === true;
      if (!ok) {
        const payload = res?.data?.error || res?.error;
        if (payload) handleErrorAlerts(payload);
        throw new Error(t("courseInfo.savePicError"));
      }
      const serverCourse = res?.data?.data || res?.data || res?.result?.data;
      rehydrateFromServer(serverCourse);
      toast.success(t("courseInfo.savePicSuccess"));
    } catch (error: any) {
      const payload = error?.response?.data?.error;
      if (payload) handleErrorAlerts(payload);
      else toast.error(error?.message || t("courseInfo.uploadPicError"));
    }
  };

  const onBlurSave: React.FocusEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  > = async (e) => {
    const name = e.target.name as keyof FormValues;
    await saveField(name);
  };

  useEffect(() => {
    if (!thumbnailFile) return;
    const url = URL.createObjectURL(thumbnailFile);
    setThumbPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  // PRE-FILL — FIXED: handle both string ID and object for sub_category
  useEffect(() => {
    if (!course || !allSubCategories?.length) return;

    const subId =
      typeof (course as any)?.sub_category === "string"
        ? (course as any).sub_category
        : (course as any)?.sub_category?.id ?? "";

    const subCate = allSubCategories.find((sc) => sc.id === subId);
    const incomingCategory = subCate?.category ?? "";

    reset(
      {
        title: course?.title ?? "",
        description: course?.description ?? "",
        level: course?.level ?? "beginner",
        price: typeof course?.price === "number" ? course?.price : "",
        sub_category: "", // ← delay this
        category: incomingCategory, // ← set category first
        picture: course?.picture ?? "",
      },
      { keepDirtyValues: false }
    );

    setThumbPreview(course?.picture ?? null);
  }, [course, allSubCategories, reset]);

  useEffect(() => {
    if (!course) return;
    if (!selectedCategory) return;
    if (subCatsLoading) return;

    const subId =
      typeof (course as any)?.sub_category === "string"
        ? (course as any).sub_category
        : (course as any)?.sub_category?.id ?? "";

    const exists = subCategories.some((sc) => sc.id === subId);
    if (exists) {
      setValue("sub_category", subId, { shouldDirty: false });
    }

    isHydratingRef.current = false;
  }, [course, selectedCategory, subCatsLoading, subCategories, setValue]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {t("courseInfo.title")}
      </h2>

      <form
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            (e.target as HTMLElement).tagName !== "TEXTAREA"
          )
            e.preventDefault();
        }}
        className="space-y-6"
        encType="multipart/form-data"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("courseInfo.courseTitle")}
          </label>
          <input
            type="text"
            placeholder={t("courseInfo.titlePlaceholder")}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            {...register("title", { onBlur: onBlurSave })}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("courseInfo.courseDescription")}
          </label>
          <textarea
            rows={5}
            placeholder={t("courseInfo.descriptionPlaceholder")}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            {...register("description", { onBlur: onBlurSave })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Price */}
          <FeatureGate
            flag="is_price_enabled"
            fallback={null}
            loadingFallback={null}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("courseInfo.coursePrice")}
              </label>
              <input
                type="number"
                min="0"
                placeholder={t("courseInfo.pricePlaceholder")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                {...register("price", {
                  valueAsNumber: true,
                  min: { value: 0, message: t("courseInfo.priceMinError") },
                  onBlur: onBlurSave,
                  onChange: (e) => {
                    const val = parseFloat(e.target.value);
                    setValue("price", Number.isFinite(val) ? val : 0, {
                      shouldDirty: true,
                    });
                  },
                })}
              />
            </div>
          </FeatureGate>

          {/* Category (UI-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("courseInfo.categoryTitle")}
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              {...register("category", {
                onChange: (e) =>
                  setValue("category", e.target.value, { shouldDirty: true }),
                onBlur: onBlurSave,
              })}
            >
              <option value="">{t("courseInfo.selectCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-category (SENT to backend) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("courseInfo.subCategory")}
            </label>
            <select
              disabled={!selectedCategory || subCatsLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60"
              {...register("sub_category", {
                onChange: (e) =>
                  setValue("sub_category", e.target.value, {
                    shouldDirty: true,
                  }),
                onBlur: onBlurSave,
              })}
            >
              <option value="">
                {selectedCategory
                  ? t("courseInfo.selectSubCategory")
                  : t("courseInfo.chooseCategoryFirst")}
              </option>
              {subCategories.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("courseInfo.level")}
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              {...register("level", {
                onChange: (e) =>
                  setValue("level", e.target.value, { shouldDirty: true }),
                onBlur: onBlurSave,
              })}
            >
              <option value="beginner">{t("courseInfo.beginner")}</option>
              <option value="intermediate">
                {t("courseInfo.intermediate")}
              </option>
              <option value="advanced">{t("courseInfo.advanced")}</option>
            </select>
          </div>
        </div>

        {/* Thumbnail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("courseInfo.thumbnail")}
          </label>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
            onClick={() => document.getElementById("course-thumb")?.click()}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">{t("courseInfo.clickToUpload")}</p>
            <p className="text-sm text-gray-500 mt-1">
              {t("courseInfo.formats")}
            </p>

            <input
              id="course-thumb"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setThumbnailFile(f);
                if (f) {
                  const url = URL.createObjectURL(f);
                  setThumbPreview(url);
                  void savePicture(f);
                }
              }}
            />

            {thumbPreview ? (
              <div className="mt-4 flex items-center justify-center">
                <img
                  src={thumbPreview}
                  alt="Course thumbnail preview"
                  className="max-h-40 rounded-lg object-cover"
                />
              </div>
            ) : (
              thumbnailFile && (
                <p className="text-sm text-gray-500 mt-2 truncate">
                  {t("courseInfo.selected", { name: thumbnailFile.name })}
                </p>
              )
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
