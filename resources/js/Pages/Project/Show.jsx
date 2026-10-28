import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { PROJECT_STATUS_CLASS_MAP, PROJECT_STATUS_TEXT_MAP } from "@/constants";
import TasksTable from "../Task/TasksTable";
import ProjectMembers from "@/Components/ProjectMembers";
import CommentSection from "@/Components/CommentSection";

const Show = ({
  auth,
  project,
  tasks,
  queryParams,
  members,
  candidates,
  mentionable,
  comments,
}) => {
  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
          {`Project: "${project.name}"`}
        </h2>
      }
    >
      <Head title={`Project: "${project.name}"`} />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8">
          {/* Top Section: Project Details (2/3) + Project Members (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Project Details Card */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
              {project.image_path && (
                <div>
                  <img
                    src={project.image_path}
                    alt={project.name}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}
              <div className="p-6 text-gray-900 dark:text-gray-100">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                      Project ID
                    </label>
                    <p className="mt-0.5 font-medium">{project.id}</p>
                  </div>
                  <div>
                    <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                      Project Name
                    </label>
                    <p className="mt-0.5 font-medium">{project.name}</p>
                  </div>
                  <div>
                    <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                      Project Status
                    </label>
                    <p className="mt-0.5">
                      <span
                        className={
                          "px-2.5 py-1 rounded text-xs font-semibold text-white " +
                          PROJECT_STATUS_CLASS_MAP[project.status]
                        }
                      >
                        {PROJECT_STATUS_TEXT_MAP[project.status]}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                      Created By
                    </label>
                    <p className="mt-0.5 font-medium">
                      {project.createdBy.name}
                    </p>
                  </div>
                  <div>
                    <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                      Due Date
                    </label>
                    <p className="mt-0.5 font-medium">{project.due_date}</p>
                  </div>
                  <div>
                    <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                      Create Date
                    </label>
                    <p className="mt-0.5 font-medium">{project.created_at}</p>
                  </div>
                  <div>
                    <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                      Updated By
                    </label>
                    <p className="mt-0.5 font-medium">
                      {project.updatedBy.name}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                    Project Description
                  </label>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {project.description || "No description provided."}
                  </p>
                </div>
              </div>
            </div>

            {/* Project Members Side Section */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
              <ProjectMembers
                project={project}
                members={members}
                candidates={candidates}
              />
            </div>
          </div>

          {/* Tasks Table */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              <h3 className="text-lg font-bold mb-4">Project Tasks</h3>
              <TasksTable
                tasks={tasks}
                queryParams={queryParams}
                hideProjectColumn={true}
              />
            </div>
          </div>

          {/* Comment Section */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <CommentSection
              type="project"
              id={project.id}
              comments={comments}
              mentionable={mentionable}
            />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Show;
