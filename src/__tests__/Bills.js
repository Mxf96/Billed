/**
 * @jest-environment jsdom
 */

// ====== Imports : outils de test ======
import { screen, waitFor, fireEvent } from "@testing-library/dom";

// ====== Setup jQuery (utile pour $.fn.modal et certains comportements) ======
import $ from "jquery";
global.$ = global.jQuery = $;

// ====== Imports : UI + données ======
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";

// ====== Imports : routing + mocks ======
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import router from "../app/Router.js";

// ====== Imports : container + store mock ======
import Bills from "../containers/Bills.js";
import mockStore from "../__mocks__/store.js";

// ====== Mock format.js (évite les erreurs et simplifie les assertions) ======
jest.mock("../app/format.js", () => ({
  formatDate: (date) => date,
  formatStatus: (status) => status,
}));

describe("I am connected as an employee", () => {
  describe("I am on Bills Page", () => {
    // ------------------------------------------------
    // TEST 1 : icône Bills active dans la navbar
    // ------------------------------------------------
    test("bill icon in vertical layout should be highlighted", async () => {
      // GIVEN : utilisateur Employee en localStorage + app routée
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

      // WHEN : l'UI est rendue
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");

      // THEN : l'icône Bills est en "active"
      expect(windowIcon.classList.contains("active-icon")).toBeTruthy();
    });

    // ------------------------------------------------
    // TEST 2 : tri des factures (anti-chronologique)
    // ------------------------------------------------
    test("bills should be ordered from latest to earliest", () => {
      // GIVEN : on rend la page Bills avec les fixtures
      document.body.innerHTML = BillsUI({ data: bills });

      // WHEN : on récupère les dates affichées dans le tableau
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i,
        )
        .map((a) => a.innerHTML);

      // THEN : elles doivent être déjà triées anti-chrono
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    // ------------------------------------------------
    // TEST 3 : getBills() récupère depuis le store + formatte
    // ------------------------------------------------
    test("getBills should fetch bills from store and format them", async () => {
      // GIVEN : localStorage mock pour éviter crash (lecture user/email)
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" }),
      );

      // AND : instance du container avec store mocké
      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore, // on injecte le mock store
        localStorage: window.localStorage,
      });

      // WHEN : on appelle getBills()
      const data = await billsContainer.getBills();

      // THEN : on récupère bien un tableau + champs attendus + tri
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);

      // vérifie qu'il y a bien les champs attendus
      expect(data[0]).toHaveProperty("date");
      expect(data[0]).toHaveProperty("status");

      // vérifie tri anti-chronologique (du plus récent au plus ancien)
      const dates = data.map((b) => b.date);
      expect(dates).toEqual([
        "2004-04-04",
        "2003-03-03",
        "2002-02-02",
        "2001-01-01",
      ]);
    });

    // ------------------------------------------------
    // TEST 4 : clic sur "Nouvelle note de frais" => navigation
    // ------------------------------------------------
    test('clicking "Nouvelle note de frais" should navigate to NewBill', () => {
      // GIVEN : user Employee + UI Bills rendue
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      }); // mock localStorage
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" })); // user connecté

      document.body.innerHTML = BillsUI({ data: bills }); // injecte la page Bills

      // AND : on spy la navigation
      const onNavigate = jest.fn();

      // AND : on instancie Bills pour binder les events
      new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      // WHEN : clic bouton new bill
      const btnNewBill = screen.getByTestId("btn-new-bill"); // récupère le bouton
      fireEvent.click(btnNewBill); // simule le clic

      // THEN : redirection vers NewBill
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
    });

    // ------------------------------------------------
    // TEST 5 : clic oeil => ouverture modale + image injectée
    // ------------------------------------------------
    test("clicking eye icon should open the modal and show the bill image", () => {
      // GIVEN : user Employee + UI Bills rendue
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      // AND : mock de bootstrap modal() (sinon erreur en test)
      $.fn.modal = jest.fn();

      document.body.innerHTML = BillsUI({ data: bills });
      const onNavigate = jest.fn();

      new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      }); // bind click sur les icônes "œil"

      // WHEN : clic sur le premier oeil
      const eyeIcons = screen.getAllByTestId("icon-eye"); // récupère toutes les icônes
      fireEvent.click(eyeIcons[0]); // clique sur la première

      // THEN : modale ouverte + HTML contient img
      expect($.fn.modal).toHaveBeenCalledWith("show"); // la modale s'ouvre
      expect(
        document.querySelector("#modaleFile .modal-body").innerHTML,
      ).toContain("img"); // l'image est injectée
    });

    // ------------------------------------------------
    // TEST 6 : test d’intégration GET (store.list appelé)
    // ------------------------------------------------
    test("INTEGRATION - getBills should call store.bills().list()", async () => {
      // GIVEN : un employee connecté en localStorage
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" }),
      );

      // AND : on espionne la méthode list() du store (appel API simulé)
      const listSpy = jest.spyOn(mockStore.bills(), "list");

      // AND : on instancie le container Bills avec un store mocké
      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      // WHEN : on appelle getBills()
      await billsContainer.getBills();

      // THEN : list() doit avoir été appelée (GET bills)
      expect(listSpy).toHaveBeenCalled();
    });

    // ------------------------------------------------
    // TEST 7 : test unitaire pur (appel direct méthode)
    // ------------------------------------------------
    test("UNIT - handleClickNewBill should navigate to NewBill", () => {
      // GIVEN : une fonction onNavigate espionnée
      const onNavigate = jest.fn();

      // AND : une instance du container Bills
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      // WHEN : on appelle directement la méthode handleClickNewBill()
      billsContainer.handleClickNewBill();

      // THEN : la navigation doit être déclenchée vers NewBill
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
    });
  });
});