import { create } from "zustand";

type AdminTab = "boat-listings" | "trips" | "bookings" | "users" | "cities" | "reviews" | "categories" | "activities";

type AdminTabStore = {
  currentTab: AdminTab;
  setTab: (tab: AdminTab) => void;
};

const useAdminTab = create<AdminTabStore>((set) => ({
  currentTab: "boat-listings",
  setTab: (tab) => set({ currentTab: tab }),
}));

export default useAdminTab;
