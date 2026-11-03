import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import Pagination from "@/Components/Pagination";
import TextInput from "@/Components/TextInput";
import SelectInput from "@/Components/SelectInput";
import TableHeading from "@/Components/TableHeading";
import Modal from "@/Components/Modal";
import DangerButton from "@/Components/DangerButton";
import SecondaryButton from "@/Components/SecondaryButton";
import PrimaryButton from "@/Components/PrimaryButton";
import {
  LockClosedIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

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
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
            Users
          </h2>
          <Link
            href={route("user.create")}
            className="bg-emerald-500 py-1 px-3 text-white rounded shadow transition-all hover:bg-emerald-600"
          >
            Add new
          </Link>
        </div>
      }
    >
      <Head title="Users" />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {success && (
            <div className="bg-emerald-500 py-2 px-4 text-white rounded mb-4">
              {success}
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900 dark:text-gray-100">
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
                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                        key={user.id}
                      >
                        <td className="px-3 py-2">{user.id}</td>
                        <th className="px-3 py-2 text-gray-100 text-nowrap">
                          <Link
                            href={route("user.show", user.id)}
                            className="px-3 py-2 font-medium text-white text-nowrap hover:underline"
                          >
                            {user.name}
                          </Link>
                        </th>
                        <td className="px-3 py-2">{user.email}</td>
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
                            <span className="px-2 py-1 rounded text-xs uppercase font-bold bg-gray-600 text-white">
                              {user.role}
                            </span>
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
                        <td className="px-3 py-2 text-nowrap">
                          {user.created_at}
                        </td>
                        <td className="px-3 py-2 text-nowrap text-right">
                          {user.is_locked && auth.user.role === "admin" && (
                            <button
                              type="button"
                              onClick={() => setUserToUnlock(user)}
                              className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline mx-1"
                            >
                              Unlock
                            </button>
                          )}
                          <Link
                            href={route("user.edit", user.id)}
                            className="font-medium text-blue-600 dark:text-blue-500 hover:underline mx-1"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            className="font-medium text-red-600 dark:text-red-500 hover:underline mx-1"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination links={users.meta.links} />
            </div>
          </div>
        </div>
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
            <SecondaryButton onClick={() => setUserToDelete(null)}>
              Cancel
            </SecondaryButton>
            <DangerButton onClick={confirmDelete}>Delete User</DangerButton>
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
            <SecondaryButton onClick={() => setUserToUnlock(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={confirmUnlock}>
              Unlock Account
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </AuthenticatedLayout>
  );
};

export default Index;
