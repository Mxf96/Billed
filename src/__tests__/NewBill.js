/**
 * @jest-environment jsdom
 */
// ====== Imports : outils de test ======
import { screen, fireEvent } from "@testing-library/dom";

// ====== Imports : UI + container ======
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";

// ====== Imports : mocks ======
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";

// ====== Imports : routes ======
import { ROUTES_PATH } from "../constants/routes.js";

describe("I am connected as an employee", () => {
  describe("I am on NewBill Page", () => {
    // ------------------------------------------------
    // TEST 1 : rendu basique de la page NewBillUI
    // ------------------------------------------------
    test("the NewBill form should be correctly rendered", () => {
      // GIVEN : on rend la page NewBillUI
      document.body.innerHTML = NewBillUI();

      // THEN : titre + formulaire + bouton existent
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
      expect(screen.getByText("Envoyer")).toBeTruthy();
    });

    // ------------------------------------------------
    // TEST 2 : fichier invalide => rejet + alert + reset state
    // ------------------------------------------------
    test("handleChangeFile should reject invalid file extension", () => {
      // GIVEN : localStorage mock + user Employee
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });

      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" }),
      );

      // AND : mock alert (sinon popup réelle + impossible à tester)
      window.alert = jest.fn();

      // AND : on rend l'UI + instancie le container (bind des events)
      document.body.innerHTML = NewBillUI(); // render UI

      const onNavigate = jest.fn(); // spy navigation
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore, // injecte mock store (bills().create)
        localStorage: window.localStorage,
      });

      // WHEN : on change le fichier avec une extension interdite
      const fileInput = screen.getByTestId("file");
      const invalidFile = new File(["dummy"], "facture.pdf", {
        type: "application/pdf",
      });

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      // THEN : alert + input reset + state reset
      expect(window.alert).toHaveBeenCalled(); // le format est refusé => alert
      expect(fileInput.value).toBe(""); // input reset
      expect(newBill.fileName).toBeNull(); // reset state
      expect(newBill.fileUrl).toBeNull(); // reset state
      expect(newBill.billId).toBeNull(); // reset state
    });

    // ------------------------------------------------
    // TEST 3 : fichier valide => store.create + MAJ fileName/fileUrl/billId
    // ------------------------------------------------
    test("handleChangeFile should accept jpg/png and store file infos", async () => {
      // GIVEN : localStorage mock + user Employee
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" }),
      );

      // AND : UI + container
      document.body.innerHTML = NewBillUI();

      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // WHEN : on upload un fichier autorisé
      const fileInput = screen.getByTestId("file");
      const validFile = new File(["dummy"], "facture.png", {
        type: "image/png",
      }); // extension autorisée

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // WAIT : on laisse passer le .then() du store.create()
      await new Promise(process.nextTick);

      // THEN : les infos sont stockées dans le container
      expect(newBill.fileName).toBe("facture.png");
      expect(newBill.fileUrl).toBeTruthy(); // (valeur renvoyée par mockStore.create)
      expect(newBill.billId).toBeTruthy(); // (key renvoyée par mockStore.create)
    });

    // ------------------------------------------------
    // TEST 4 : submit form => updateBill appelé + navigation vers Bills
    // ------------------------------------------------
    test("Submitting the form should call update and navigate to Bills", async () => {
      // GIVEN : localStorage mock + user Employee
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" }),
      );

      // AND : UI + container
      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // AND : on simule un upload déjà fait
      newBill.fileUrl = "https://localhost:3456/images/test.jpg";
      newBill.fileName = "test.jpg";
      newBill.billId = "1234";

      // WHEN : on remplit les champs requis
      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Transports" },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Taxi" },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: "120" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2026-02-10" },
      });
      fireEvent.change(screen.getByTestId("vat"), {
        target: { value: "20" },
      });
      fireEvent.change(screen.getByTestId("pct"), {
        target: { value: "20" },
      });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "course client" },
      });

      // AND : spy updateBill pour vérifier qu'il est appelé
      const updateSpy = jest
        .spyOn(newBill, "updateBill")
        .mockImplementation(() => Promise.resolve());

      // AND : submit du formulaire
      const form = screen.getByTestId("form-new-bill");
      fireEvent.submit(form);

      // THEN : updateBill est déclenché + navigation
      expect(updateSpy).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
    });

    // ------------------------------------------------
    // TEST 5 : POST (intégration) => store.update est appelé
    // ------------------------------------------------
    test("INTEGRATION - submit should call store.bills().update()", async () => {
      // GIVEN : un employee connecté en localStorage
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" }),
      );

      // AND : l’UI NewBill est affichée
      document.body.innerHTML = NewBillUI();

      // AND : on espionne la méthode update() du store (POST simulé)
      const updateSpy = jest.spyOn(mockStore.bills(), "update");

      // AND : on instancie le container NewBill (bind des events)
      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      // AND : on simule un upload déjà effectué (sinon billId/fileUrl n’existent pas)
      newBill.fileUrl = "https://localhost:3456/images/test.jpg";
      newBill.fileName = "test.jpg";
      newBill.billId = "1234";

      // WHEN : on remplit quelques champs minimum et on submit le formulaire
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Taxi" },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: "120" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2026-02-10" },
      });
      fireEvent.submit(screen.getByTestId("form-new-bill"));

      // THEN : update() doit avoir été appelée (POST new bill)
      expect(updateSpy).toHaveBeenCalled();
    });
  });
});