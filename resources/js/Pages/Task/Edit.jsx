import React, { useRef, useState } from "react";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import SelectInput from "@/Components/SelectInput";
import TextAreaInput from "@/Components/TextAreaInput";
import TextInput from "@/Components/TextInput";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";

const Edit = ({ auth, task, projects, users }) => {
  const fileInputRef = useRef(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [newImageName, setNewImageName] = useState("");

  const formattedDueDate = task.due_date ? task.due_date.split(" ")[0] : "";

  const { data, setData, post, errors } = useForm({
    image: "",
    name: task.name || "",
    status: task.status || "",
    description: task.description || "",
    due_date: formattedDueDate,
    project_id: task.project_id || task.project?.id || "",
    priority: task.priority || "",
    assigned_user_id: task.assigned_user_id || task.assignedUser?.id || "",
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
    post(route("task.update", task.id));
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
            Edit task "{data.name}"
          </h2>
        </div>
      }
    >
      <Head title="Edit Task" />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <form
              onSubmit={onSubmit}
              className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
            >
              {/* Existing Task Image */}
              {task.image_path && !newImagePreview && (
                <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                    Current Task Image
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <img
                      src={task.image_path}
                      alt={task.name}
                      className="w-48 h-32 rounded-lg object-cover border border-gray-200 dark:border-gray-600 shadow-sm"
                    />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <PhotoIcon className="w-4 h-4 text-indigo-500" />
                        <span>{task.image_name || "task_image.jpg"}</span>
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

              {/* Project Selection */}
              <div>
                <InputLabel htmlFor="task_project_id" value="Project" />

                <SelectInput
                  name="project_id"
                  id="task_project_id"
                  value={data.project_id}
                  className="mt-1 block w-full"
                  onChange={(e) => setData("project_id", e.target.value)}
                >
                  <option value="">Select Project</option>
                  {projects.data.map((project) => (
                    <option value={project.id} key={project.id}>
                      {project.name}
                    </option>
                  ))}
                </SelectInput>

                <InputError message={errors.project_id} className="mt-2" />
              </div>

              {/* Image Input */}
              <div className="mt-4">
                <InputLabel
                  htmlFor="task_image_path"
                  value="Task Image (optional)"
                />
                <TextInput
                  id="task_image_path"
                  ref={fileInputRef}
                  type="file"
                  name="image"
                  className="mt-1 block w-full"
                  onChange={handleImageChange}
                />
                <InputError message={errors.image} className="mt-2" />
              </div>

              {/* Task Name */}
              <div className="mt-4">
                <InputLabel htmlFor="task_name" value="Task Name" />

                <TextInput
                  id="task_name"
                  type="text"
                  name="name"
                  value={data.name}
                  className="mt-1 block w-full"
                  isFocused={true}
                  onChange={(e) => setData("name", e.target.value)}
                />

                <InputError message={errors.name} className="mt-2" />
              </div>

              {/* Task Description */}
              <div className="mt-4">
                <InputLabel
                  htmlFor="task_description"
                  value="Task Description"
                />

                <TextAreaInput
                  id="task_description"
                  name="description"
                  value={data.description}
                  className="mt-1 block w-full"
                  onChange={(e) => setData("description", e.target.value)}
                />

                <InputError message={errors.description} className="mt-2" />
              </div>

              {/* Task Deadline */}
              <div className="mt-4">
                <InputLabel htmlFor="task_due_date" value="Task Deadline" />

                <TextInput
                  id="task_due_date"
                  type="date"
                  name="due_date"
                  value={data.due_date || ""}
                  className="mt-1 block w-full"
                  onChange={(e) => setData("due_date", e.target.value)}
                />

                <InputError message={errors.due_date} className="mt-2" />
              </div>

              {/* Task Status */}
              <div className="mt-4">
                <InputLabel htmlFor="task_status" value="Task Status" />

                <SelectInput
                  name="status"
                  id="task_status"
                  value={data.status}
                  className="mt-1 block w-full"
                  onChange={(e) => setData("status", e.target.value)}
                >
                  <option value="">Select Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  {["admin", "manager"].includes(auth.user.role) && (
                    <option value="closed">Closed</option>
                  )}
                </SelectInput>

                <InputError message={errors.status} className="mt-2" />
              </div>

              {/* Task Priority */}
              <div className="mt-4">
                <InputLabel htmlFor="task_priority" value="Task Priority" />

                <SelectInput
                  name="priority"
                  id="task_priority"
                  value={data.priority}
                  className="mt-1 block w-full"
                  onChange={(e) => setData("priority", e.target.value)}
                >
                  <option value="">Select Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </SelectInput>

                <InputError message={errors.priority} className="mt-2" />
              </div>

              {/* Assigned User */}
              <div className="mt-4">
                <InputLabel
                  htmlFor="task_assigned_user"
                  value="Assigned User"
                />

                <SelectInput
                  name="assigned_user_id"
                  id="task_assigned_user"
                  value={data.assigned_user_id}
                  className="mt-1 block w-full"
                  onChange={(e) => setData("assigned_user_id", e.target.value)}
                >
                  <option value="">Select User</option>
                  {users.data.map((user) => (
                    <option value={user.id} key={user.id}>
                      {user.name}
                    </option>
                  ))}
                </SelectInput>

                <InputError
                  message={errors.assigned_user_id}
                  className="mt-2"
                />
              </div>

              {/* Submit Buttons */}
              <div className="mt-6 text-right">
                <Link
                  href={route("task.index")}
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
