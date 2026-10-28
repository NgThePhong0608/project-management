import React, { useRef, useState } from "react";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import SelectInput from "@/Components/SelectInput";
import TextAreaInput from "@/Components/TextAreaInput";
import TextInput from "@/Components/TextInput";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";

const Edit = ({ auth, project }) => {
  const fileInputRef = useRef(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [newImageName, setNewImageName] = useState("");

  const formattedDueDate = project.due_date
    ? project.due_date.split(" ")[0]
    : "";

  const { data, setData, post, errors } = useForm({
    image: "",
    name: project.name || "",
    status: project.status || "",
    description: project.description || "",
    due_date: formattedDueDate,
    _method: "PUT",
  });

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setData("image", file);
      setNewImagePreview(URL.createObjectURL(file));
      setNewImageName(file.name);
    }
  };

  const removeNewImage = () => {
    setData("image", "");
    setNewImagePreview(null);
    setNewImageName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    post(route("project.update", project.id));
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
            Edit Project "{project.name}"
          </h2>
        </div>
      }
    >
      <Head title={`Edit Project: "${project.name}"`} />
      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <form
              onSubmit={onSubmit}
              className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
            >
              {/* Existing Project Image */}
              {project.image_path && !newImagePreview && (
                <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                    Current Project Image
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <img
                      src={project.image_path}
                      alt={project.name}
                      className="w-48 h-32 rounded-lg object-cover border border-gray-200 dark:border-gray-600 shadow-sm"
                    />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <PhotoIcon className="w-4 h-4 text-indigo-500" />
                        <span>{project.image_name || "project_image.jpg"}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Select a new image below if you wish to replace this
                        file.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Newly Selected Image Preview */}
              {newImagePreview && (
                <div className="mb-6 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-2">
                    New Image Selected
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <img
                      src={newImagePreview}
                      alt="New preview"
                      className="w-48 h-32 rounded-lg object-cover border border-indigo-300 dark:border-indigo-700 shadow-sm"
                    />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <PhotoIcon className="w-4 h-4 text-indigo-500" />
                        <span>{newImageName}</span>
                      </p>
                      <button
                        type="button"
                        onClick={removeNewImage}
                        className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline mt-1.5 font-medium"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                        <span>Cancel selection (keep current image)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Input */}
              <div>
                <InputLabel
                  htmlFor="project_image_path"
                  value="Project Image (optional)"
                />
                <TextInput
                  id="project_image_path"
                  ref={fileInputRef}
                  type="file"
                  name="image"
                  className="mt-1 block w-full"
                  onChange={handleImageChange}
                />
                <InputError message={errors.image} className="mt-2" />
              </div>

              {/* Project Name */}
              <div className="mt-4">
                <InputLabel htmlFor="project_name" value="Project Name" />
                <TextInput
                  id="project_name"
                  type="text"
                  name="name"
                  className="mt-1 block w-full"
                  value={data.name}
                  onChange={(e) => setData("name", e.target.value)}
                />
                <InputError message={errors.name} className="mt-2" />
              </div>

              {/* Project Description */}
              <div className="mt-4">
                <InputLabel
                  htmlFor="project_description"
                  value="Project Description"
                />
                <TextAreaInput
                  id="project_description"
                  name="description"
                  className="mt-1 block w-full"
                  value={data.description}
                  onChange={(e) => setData("description", e.target.value)}
                />
                <InputError message={errors.description} className="mt-2" />
              </div>

              {/* Project Deadline */}
              <div className="mt-4">
                <InputLabel
                  htmlFor="project_due_date"
                  value="Project Deadline"
                />
                <TextInput
                  id="project_due_date"
                  type="date"
                  name="due_date"
                  className="mt-1 block w-full"
                  value={data.due_date || ""}
                  onChange={(e) => setData("due_date", e.target.value)}
                />
                <InputError message={errors.due_date} className="mt-2" />
              </div>

              {/* Project Status */}
              <div className="mt-4">
                <InputLabel htmlFor="project_status" value="Project Status" />
                <SelectInput
                  name="status"
                  id="project_status"
                  className="mt-1 block w-full"
                  value={data.status}
                  onChange={(e) => setData("status", e.target.value)}
                >
                  <option value="">Select Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </SelectInput>
                <InputError message={errors.status} className="mt-2" />
              </div>

              {/* Actions */}
              <div className="mt-6 text-right">
                <Link
                  href={route("project.index")}
                  className="bg-gray-100 py-1.5 px-3 text-gray-800 rounded shadow transition-all hover:bg-gray-200 mr-2 text-sm"
                >
                  Cancel
                </Link>
                <button className="bg-emerald-500 py-1.5 px-4 text-white rounded shadow transition-all hover:bg-emerald-600 text-sm font-medium">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Edit;
