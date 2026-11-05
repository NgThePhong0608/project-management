import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import TasksTable from "./TasksTable";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Plus } from "lucide-react";

const Index = ({ auth, tasks, queryParams = null, success }) => {
  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
          Tasks
        </h2>
      }
    >
      <Head title="Tasks" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 py-2.5 px-4 rounded-lg mb-4 text-sm font-medium">
            {success}
          </div>
        )}

        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <CardTitle className="text-base font-semibold">
                Tasks List
              </CardTitle>
              <CardDescription className="text-xs">
                Manage, filter, and track all workspace tasks.
              </CardDescription>
            </div>
            {auth?.can?.createTask && (
              <Link href={route("task.create")}>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>Add new task</span>
                </Button>
              </Link>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <TasksTable tasks={tasks} queryParams={queryParams} />
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default Index;
