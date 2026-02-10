/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

import router from "../app/Router.js";

import Bills from "../containers/Bills.js"; // on teste le container
import mockStore from "../__mocks__/store.js";

jest.mock("../app/format.js", () => ({
  formatDate: (date) => date,
  formatStatus: (status) => status,
}));

describe("I am connected as an employee", () => {
  describe("I am on Bills Page", () => {
    test("bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        }),
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH["Bills"]);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");

      expect(windowIcon.classList.contains("active-icon")).toBeTruthy();
    });
    
    test("bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i,
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    test("getBills should fetch bills from store and format them", async () => {
      // mock localStorage pour que le container ne crash pas
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" }),
      );

      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore, // on injecte le mock store
        localStorage: window.localStorage,
      });

      const data = await billsContainer.getBills();

      // vérifie qu'on récupère bien un tableau
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);

      // vérifie qu'il y a bien les champs attendus
      expect(data[0]).toHaveProperty("date");
      expect(data[0]).toHaveProperty("status");

      // vérifie tri décroissant (2004, 2003, 2002, 2001)
      const dates = data.map((b) => b.date);
      expect(dates).toEqual([
        "2004-04-04",
        "2003-03-03",
        "2002-02-02",
        "2001-01-01",
      ]);
    });
  });
});
