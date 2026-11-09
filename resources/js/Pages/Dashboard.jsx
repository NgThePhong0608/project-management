import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
  PROJECT_STATUS_CLASS_MAP,
  PROJECT_STATUS_TEXT_MAP,
  TASK_STATUS_CLASS_MAP,
  TASK_STATUS_TEXT_MAP,
} from "@/constants";
import { Head, Link } from "@inertiajs/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/Components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/Components/ui/table";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  FolderKanban,
  CheckSquare,
  ArrowUpRight,
  Users,
} from "lucide-react";

const ROLE_BADGE_MAP = {
  owner: {
    label: "Owner",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300/40",
  },
  manager: {
    label: "Manager",
    className:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border-indigo-300/40",
  },
  member: {
    label: "Joined",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300/40",
  },
};

export default function Dashboard({
  auth,
  totalPendingTasks,
  myPendingTasks,
  totalProgressTasks,
  myProgressTasks,
  totalCompletedTasks,
  myCompletedTasks,
  activeTasks,
  projectsOverview = { data: [] },
}) {
  const projectsList = projectsOverview?.data || [];

  const metrics = [
    {
      title: "Pending Tasks",
      my: myPendingTasks,
      total: totalPendingTasks,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
      borderColor: "border-amber-200 dark:border-amber-800/40",
      badgeVariant: "warning",
      percent:
        totalPendingTasks > 0
          ? Math.round((myPendingTasks / totalPendingTasks) * 100)
          : 0,
    },
    {
      title: "In Progress",
      my: myProgressTasks,
      total: totalProgressTasks,
      icon: PlayCircle,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
      borderColor: "border-blue-200 dark:border-blue-800/40",
      badgeVariant: "info",
      percent:
        totalProgressTasks > 0
          ? Math.round((myProgressTasks / totalProgressTasks) * 100)
          : 0,
    },
    {
      title: "Completed Tasks",
      my: myCompletedTasks,
      total: totalCompletedTasks,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
      borderColor: "border-emerald-200 dark:border-emerald-800/40",
      badgeVariant: "success",
      percent:
        totalCompletedTasks > 0
          ? Math.round((myCompletedTasks / totalCompletedTasks) * 100)
          : 0,
    },
  ];

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
            Workspace Dashboard
          </span>
          <Badge variant="outline" className="text-xs font-mono">
            {auth.user.role}
          </Badge>
        </div>
      }
    >
      <Head title="Dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {metrics.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div
                  className={`absolute top-0 left-0 h-1 w-full ${item.bgColor}`}
                />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {item.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {item.my}{" "}
                      <span className="text-sm font-normal text-gray-400">
                        / {item.total} total
                      </span>
                    </div>
                    <Badge variant={item.badgeVariant}>
                      {item.percent}% assigned
                    </Badge>
                  </div>
                  {/* Subtle mini progress bar */}
                  <div className="mt-3 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color.replace("text-", "bg-")}`}
                      style={{ width: `${Math.min(100, item.percent)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Projects Overview Table Card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base font-semibold">
                  {auth.user.role === "admin"
                    ? "All Projects Overview"
                    : "Projects Joined & Managed"}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {auth.user.role === "admin"
                  ? "Global workspace visibility of projects, members, and task metrics."
                  : "Projects you created, lead, or collaborate on as a team member."}
              </CardDescription>
            </div>
            <Link href={route("project.index")}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>View all projects</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectsList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-gray-400 italic"
                    >
                      No active projects in this workspace.
                    </TableCell>
                  </TableRow>
                ) : (
                  projectsList.map((project) => {
                    const preview = project.members_preview || [];
                    const count = project.members_count ?? 0;
                    const remaining = Math.max(0, count - preview.length);
                    const roleBadge =
                      ROLE_BADGE_MAP[project.my_project_role] ||
                      (auth.user.role === "admin"
                        ? {
                            label: "Admin View",
                            className:
                              "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300/40",
                          }
                        : null);

                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-mono text-xs text-gray-500">
                          #{project.id}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          <Link
                            href={route("project.show", project.id)}
                            className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              "px-2.5 py-0.5 rounded-full text-xs font-semibold text-white " +
                              PROJECT_STATUS_CLASS_MAP[project.status]
                            }
                          >
                            {PROJECT_STATUS_TEXT_MAP[project.status]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {preview.map((member) =>
                                member.avatar_url ? (
                                  <img
                                    key={member.id}
                                    src={member.avatar_url}
                                    alt={member.name}
                                    title={`${member.name}${member.role ? ` (${member.role})` : ""}`}
                                    className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-900 object-cover"
                                  />
                                ) : (
                                  <span
                                    key={member.id}
                                    title={`${member.name}${member.role ? ` (${member.role})` : ""}`}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white ring-2 ring-white dark:ring-gray-900"
                                  >
                                    {member.name?.charAt(0)?.toUpperCase() ||
                                      "?"}
                                  </span>
                                ),
                              )}
                              {remaining > 0 && (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-semibold text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-900">
                                  +{remaining}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                              {count}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {project.tasks_count ?? 0} tasks
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {roleBadge && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-medium border ${roleBadge.className}`}
                            >
                              {roleBadge.label}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {project.createdBy?.name || "System"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-gray-500 font-mono">
                          {project.due_date || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* My Active Tasks Table Card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base font-semibold">
                  My Active Tasks
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Tasks currently assigned to you across all projects.
              </CardDescription>
            </div>
            <Link href={route("task.index")}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>View all tasks</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTasks?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-gray-400 italic"
                    >
                      You have no active tasks at the moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeTasks?.data?.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono text-xs text-gray-500">
                        #{task.id}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        <Link
                          href={route("project.show", task.project.id)}
                          className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {task.project.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        <Link
                          href={route("task.show", task.id)}
                          className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {task.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            "px-2.5 py-0.5 rounded-full text-xs font-semibold text-white " +
                            TASK_STATUS_CLASS_MAP[task.status]
                          }
                        >
                          {TASK_STATUS_TEXT_MAP[task.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-gray-500 font-mono">
                        {task.due_date || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
