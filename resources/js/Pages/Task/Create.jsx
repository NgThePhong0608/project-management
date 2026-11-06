import React, { useState } from "react";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import SelectInput from "@/Components/SelectInput";
import TextAreaInput from "@/Components/TextAreaInput";
import TextInput from "@/Components/TextInput";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { Badge } from "@/Components/ui/badge";
import axios from "axios";

const Create = ({ auth, projects, users }) => {
  const [enhancing, setEnhancing] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);
  const [subtasks, setSubtasks] = useState(null);
  const [appendedSuccess, setAppendedSuccess] = useState(false);

  const { data, setData, post, errors } = useForm({
    image: "",
    name: "",
    status: "",
    description: "",
    due_date: "",
    project_id: "",
    priority: "",
    assigned_user_id: "",
  });

  const handleAiEnhance = async () => {
    if (!data.name?.trim() || !data.description?.trim()) {
      alert(
        "Please enter a task name and at least a brief description before using AI Enhance.",
      );
      return;
    }

    setEnhancing(true);
    try {
      const res = await axios.post(route("task.ai.enhance"), {
        title: data.name,
        description: data.description,
        project_id: data.project_id || null,
      });

      if (res.data?.enhanced_description) {
        setData("description", res.data.enhanced_description);
      }
    } catch (err) {
      console.error("AI Enhance error:", err);
      alert(
        err.response?.data?.message || "Failed to enhance description with AI.",
      );
    } finally {
      setEnhancing(false);
    }
  };

  const handleAiBreakdown = async () => {
    if (!data.name?.trim()) {
      alert("Please enter a task name before requesting an AI breakdown.");
      return;
    }

    setBreakingDown(true);
    setAppendedSuccess(false);
    try {
      const res = await axios.post(route("task.ai.breakdown"), {
        title: data.name,
        description: data.description || "",
        project_id: data.project_id || null,
      });

      if (res.data?.subtasks && Array.isArray(res.data.subtasks)) {
        setSubtasks(res.data.subtasks);
      }
    } catch (err) {
      console.error("AI Breakdown error:", err);
      alert(err.response?.data?.message || "Failed to generate AI breakdown.");
    } finally {
      setBreakingDown(false);
    }
  };

  const handleAppendSubtasks = () => {
    if (!subtasks || !subtasks.length) return;

    const markdown =
      "\n\n### AI Subtasks\n" +
      subtasks
        .map((s) => `- [ ] **${s.name}** (${s.priority}): ${s.description}`)
        .join("\n");
    setData(
      "description",
      (data.description ? data.description.trim() : "") + markdown,
    );
    setAppendedSuccess(true);
    setTimeout(() => setAppendedSuccess(false), 3000);
  };

  const onSubmit = (e) => {
    e.preventDefault();

    post(route("task.store"));
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
            Create new Task
          </h2>
        </div>
      }
    >
      <Head title="Tasks" />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <form
              onSubmit={onSubmit}
              className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
            >
              <div>
                <InputLabel htmlFor="task_project_id" value="Project" />

                <SelectInput
                  name="project_id"
                  id="task_project_id"
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

              <div className="mt-4">
                <InputLabel htmlFor="task_image_path" value="Task Image" />
                <TextInput
                  id="task_image_path"
                  type="file"
                  name="image"
                  className="mt-1 block w-full"
                  onChange={(e) => setData("image", e.target.files[0])}
                />
                <InputError message={errors.image} className="mt-2" />
              </div>

              <div className="mt-4">
                <div className="flex justify-between items-center mb-1">
                  <InputLabel htmlFor="task_name" value="Task Name" />
                  <button
                    type="button"
                    disabled={breakingDown}
                    onClick={handleAiBreakdown}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {breakingDown ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating subtasks...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>✨ AI Breakdown</span>
                      </>
                    )}
                  </button>
                </div>

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

              {/* Subtasks Preview Card */}
              {subtasks && subtasks.length > 0 && (
                <div className="mt-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Suggested Subtasks ({subtasks.length})
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAppendSubtasks}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs"
                      >
                        {appendedSuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Appended!</span>
                          </>
                        ) : (
                          <span>Append to description</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubtasks(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {subtasks.map((task, idx) => (
                      <li
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs"
                      >
                        <div className="text-xs">
                          <span className="font-semibold text-gray-800 dark:text-gray-200 mr-1.5">
                            {task.name}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {task.description}
                          </span>
                        </div>
                        <div>
                          <Badge
                            variant={
                              task.priority === "high"
                                ? "destructive"
                                : task.priority === "medium"
                                  ? "warning"
                                  : "info"
                            }
                            className="text-[10px] uppercase font-bold"
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4">
                <div className="flex justify-between items-center mb-1">
                  <InputLabel
                    htmlFor="task_description"
                    value="Task Description"
                  />
                  <button
                    type="button"
                    disabled={enhancing}
                    onClick={handleAiEnhance}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {enhancing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enhancing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>✨ AI Enhance</span>
                      </>
                    )}
                  </button>
                </div>

                <TextAreaInput
                  id="task_description"
                  name="description"
                  value={data.description}
                  className="mt-1 block w-full"
                  rows="6"
                  onChange={(e) => setData("description", e.target.value)}
                />

                <InputError message={errors.description} className="mt-2" />
              </div>

              <div className="mt-4">
                <InputLabel htmlFor="task_due_date" value="Task Deadline" />

                <TextInput
                  id="task_due_date"
                  type="date"
                  name="due_date"
                  value={data.due_date}
                  className="mt-1 block w-full"
                  onChange={(e) => setData("due_date", e.target.value)}
                />

                <InputError message={errors.due_date} className="mt-2" />
              </div>

              <div className="mt-4">
                <InputLabel htmlFor="task_status" value="Task Status" />

                <SelectInput
                  name="status"
                  id="task_status"
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

              <div className="mt-4">
                <InputLabel htmlFor="task_priority" value="Task Priority" />

                <SelectInput
                  name="priority"
                  id="task_priority"
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

              <div className="mt-4">
                <InputLabel
                  htmlFor="task_assigned_user"
                  value="Assigned User"
                />

                <SelectInput
                  name="assigned_user_id"
                  id="task_assigned_user"
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

              <div className="mt-4 text-right">
                <Link
                  href={route("task.index")}
                  className="bg-gray-100 py-1 px-3 text-gray-800 rounded shadow transition-all hover:bg-gray-200 mr-2"
                >
                  Cancel
                </Link>
                <button className="bg-emerald-500 py-1 px-3 text-white rounded shadow transition-all hover:bg-emerald-600">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Create;
