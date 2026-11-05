import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import Pagination from "@/Components/Pagination";
import TextInput from "@/Components/TextInput";
import SelectInput from "@/Components/SelectInput";
import TableHeading from "@/Components/TableHeading";
import Modal from "@/Components/Modal";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import {
  LockClosedIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { Plus } from "lucide-react";

const Index = ({ auth, users, queryParams = null, success }) => {
  queryParams = queryParams || {};

  const [userToDelete, setUserToDelete] = useState(null);
  const [userToUnlock, setUserToUnlock] = useState(null);

  const searchFieldChanged = (name, value) => {
    if (value) {
      queryParams[name] = value;
    } else {
      delete queryParams[name];
    }

    router.get(route("user.index", queryParams));
  };

  const onKeyPress = (name, e) => {
    if (e.key === "Enter") {
      searchFieldChanged(name, e.target.value);
    }
  };

  const sortChanged = (name) => {
    if (queryParams.sort_field === name) {
      if (queryParams.sort_direction === "asc") {
        queryParams.sort_direction = "desc";
      } else {
        queryParams.sort_direction = "asc";
      }
    } else {
      queryParams.sort_field = name;
      queryParams.sort_direction = "asc";
    }

    router.get(route("user.index", queryParams));
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    router.delete(route("user.destroy", userToDelete.id), {
      onFinish: () => setUserToDelete(null),
    });
  };

  const confirmUnlock = () => {
    if (!userToUnlock) return;
    router.post(
      route("user.unlock", userToUnlock.id),
      {},
      {
        onFinish: () => setUserToUnlock(null),
      },
    );
  };

  const updateUserRole = (user, newRole) => {
    if (!newRole || newRole === user.role) {
      return;
    }
    router.patch(
      route("user.updateRole", user.id),
      { role: newRole },
      { preserveScroll: true },
    );
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
          Users
        </h2>
      }
    >
      <Head title="Users" />

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
                Users List
              </CardTitle>
              <CardDescription className="text-xs">
                Manage workspace members, roles, security settings, and access
                control.
              </CardDescription>
            </div>
            {auth.user.role === "admin" && (
              <Link href={route("user.create")}>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>Add new user</span>
                </Button>
              </Link>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b-2 border-gray-500">
                  <tr className="text-nowrap">
                    <TableHeading
                      name="id"
                      sort_field={queryParams.sort_field}
                      sort_direction={queryParams.sort_direction}
                      sortChanged={sortChanged}
                    >
                      ID
                    </TableHeading>
                    <TableHeading
                      name="name"
                      sort_field={queryParams.sort_field}
                      sort_direction={queryParams.sort_direction}
                      sortChanged={sortChanged}
                    >
                      Name
                    </TableHeading>

                    <TableHeading
                      name="email"
                      sort_field={queryParams.sort_field}
                      sort_direction={queryParams.sort_direction}
                      sortChanged={sortChanged}
                    >
                      Email
                    </TableHeading>

                    <TableHeading
                      name="role"
                      sort_field={queryParams.sort_field}
                      sort_direction={queryParams.sort_direction}
                      sortChanged={sortChanged}
                    >
                      Role
                    </TableHeading>

                    <th className="px-3 py-3">Security & Status</th>

                    <TableHeading
                      name="created_at"
                      sort_field={queryParams.sort_field}
                      sort_direction={queryParams.sort_direction}
                      sortChanged={sortChanged}
                    >
                      Create Date
                    </TableHeading>

                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b-2 border-gray-500">
                  <tr className="text-nowrap">
                    <th className="px-3 py-3"></th>
                    <th className="px-3 py-3">
                      <TextInput
                        className="w-full"
                        defaultValue={queryParams.name}
                        placeholder="User Name"
                        onBlur={(e) =>
                          searchFieldChanged("name", e.target.value)
                        }
                        onKeyPress={(e) => onKeyPress("name", e)}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <TextInput
                        className="w-full"
                        defaultValue={queryParams.email}
                        placeholder="User Email"
                        onBlur={(e) =>
                          searchFieldChanged("email", e.target.value)
                        }
                        onKeyPress={(e) => onKeyPress("email", e)}
                      />
                    </th>
                    <th className="px-3 py-3">
                      <SelectInput
                        className="w-full"
                        defaultValue={queryParams.role}
                        onChange={(e) =>
                          searchFieldChanged("role", e.target.value)
                        }
                      >
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="member">Member</option>
                      </SelectInput>
                    </th>
                    <th className="px-3 py-3"></th>
                    <th className="px-3 py-3"></th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((user) => (
                    <tr
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors"
                      key={user.id}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                        #{user.id}
                      </td>
                      <th className="px-3 py-2 text-gray-100 text-nowrap">
                        <Link
                          href={route("user.show", user.id)}
                          className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                        >
                          {user.name}
                        </Link>
                      </th>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-3 py-2">
                        {auth.user.role === "admin" ? (
                          <select
                            value={user.role}
                            onChange={(e) =>
                              updateUserRole(user, e.target.value)
                            }
                            className="text-xs font-semibold uppercase rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 py-1 pl-2.5 pr-7 focus:ring-indigo-500 focus:border-indigo-500"
                            title="Quick update user role"
                          >
                            <option value="member">MEMBER</option>
                            <option value="manager">MANAGER</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="uppercase font-semibold text-[11px]"
                          >
                            {user.role}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {user.is_locked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                              <LockClosedIcon className="w-3 h-3" />
                              Locked
                            </span>
                          ) : null}

                          {user.has_mfa ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              <ShieldCheckIcon className="w-3 h-3" />
                              2FA Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              <ShieldExclamationIcon className="w-3 h-3" />
                              No 2FA ({user.mfa_unconfigured_login_count ?? 0}
                              /5)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {user.created_at}
                      </td>
                      <td className="px-3 py-2 text-nowrap text-right space-x-1.5">
                        {user.is_locked && auth.user.role === "admin" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                            onClick={() => setUserToUnlock(user)}
                          >
                            Unlock
                          </Button>
                        )}
                        <Link href={route("user.edit", user.id)}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs text-blue-600 dark:text-blue-400"
                          >
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => setUserToDelete(user)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <Pagination links={users.meta.links} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete User Modal */}
      <Modal
        show={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        maxWidth="md"
      >
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Confirm Delete User
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete user "{userToDelete?.name}"? All
            associated data will be permanently removed.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unlock User Modal */}
      <Modal
        show={Boolean(userToUnlock)}
        onClose={() => setUserToUnlock(null)}
        maxWidth="md"
      >
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Unlock Account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to unlock user "{userToUnlock?.name}"? Their
            unconfigured login count will be reset to 0, allowing them to sign
            in immediately.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setUserToUnlock(null)}>
              Cancel
            </Button>
            <Button variant="default" onClick={confirmUnlock}>
              Unlock Account
            </Button>
          </div>
        </div>
      </Modal>
    </AuthenticatedLayout>
  );
};

export default Index;
