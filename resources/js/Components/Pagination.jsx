import { Link } from "@inertiajs/react";
import React from "react";

const Pagination = ({ links, preserveScroll = true }) => {
  return (
    <nav className="text-center mt-4">
      {links.map((link, index) => (
        <Link
          key={index}
          href={link.url}
          preserveScroll={preserveScroll}
          className={
            "inline-block py-2 px-3 rounded-lg text-xs transition " +
            (link.active
              ? "bg-gray-900 text-white dark:bg-gray-950 dark:text-white font-semibold "
              : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-950 ") +
            (!link.url
              ? "!text-gray-400 dark:!text-gray-500 cursor-not-allowed hover:bg-transparent "
              : "")
          }
        >
          <span dangerouslySetInnerHTML={{ __html: link.label }}></span>
        </Link>
      ))}
    </nav>
  );
};

export default Pagination;
