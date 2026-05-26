import { useRouter, useSearchParams } from "next/navigation";
import useAdminTab from "../../_hooks/useAdminTab";
import AdminDashboardNavbarSingleTab from "./AdminDashboardNavbarSingleTab";

type navItemsType = {
  tabId: "boat-listings" | "trips" | "bookings" | "users" | "cities" | "reviews" | "categories" | "activities";
  tabLabel: string;
}[];

export default function AdminDashboardNavbar() {
  const { currentTab } = useAdminTab();
  const router = useRouter();
  const searchParams = useSearchParams();

  const navItems: navItemsType = [
    { tabId: "boat-listings", tabLabel: "Boats" },
    { tabId: "trips", tabLabel: "Trips" },
    { tabId: "bookings", tabLabel: "Bookings" },
    { tabId: "users", tabLabel: "Users" },
    { tabId: "cities", tabLabel: "Cities" },
    { tabId: "categories", tabLabel: "Categories" },
    { tabId: "activities", tabLabel: "Activities" },
    { tabId: "reviews", tabLabel: "Reviews" },
  ];

  const handleTabClick = (tabId: string) => {
    // Determine strict type if needed, or just force cast/string
    // Update local state is handled by parent useEffect now, OR we can do both for responsiveness
    // Better to push URL and let parent sync, but for immediate feedback we can setTab too?
    // Actually, setting tab immediately makes it feel faster. The useEffect will confirm it.

    // Construct new URL parameters
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);

    // Clear specific item params when switching main tabs explicitly
    params.delete("boatId");
    params.delete("tripId");
    params.delete("userId");
    params.delete("user");
    params.delete("action");

    router.push(`/admin-dashboard?${params.toString()}`);
    // setTab(tabId as any); // Optional: Layout useEffect handles this
  };

  return (
    <div
      className="
        bg-[#ecebef]
        rounded-2xl
        py-1 px-1
        flex
        gap-1
        overflow-x-auto
        scrollbar-hide
        sm:flex-wrap
        sm:justify-start
      "
    >
      {navItems.map((item) => (
        <AdminDashboardNavbarSingleTab
          key={item.tabId}
          label={item.tabLabel}
          isActive={currentTab === item.tabId}
          onClick={() => handleTabClick(item.tabId)}
        />
      ))}
    </div>
  );
}
