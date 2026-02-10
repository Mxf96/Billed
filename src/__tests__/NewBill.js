/**
 * @jest-environment jsdom
 */

import { screen, fireEvent } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";

describe("I am connected as an employee", () => {
  describe("I am on NewBill Page", () => {
    test("the NewBill form should be correctly rendered", () => {
      // 🔹 Rendu du composant NewBillUI dans le DOM
      const html = NewBillUI();
      document.body.innerHTML = html;

      // 🔹 Vérification du titre de la page
      // Permet de valider que l'utilisateur est bien sur la page NewBill
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();

      // 🔹 Vérification de la présence du formulaire
      // Assure que le formulaire principal est bien affiché
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();

      // 🔹 Vérification de la présence du bouton d'envoi
      // Confirme que l'utilisateur peut soumettre une note de frais
      expect(screen.getByText("Envoyer")).toBeTruthy();
    });

    test("handleChangeFile should reject invalid file extension", () => {
      // mock localStorage
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" }),
      );

      // mock alert
      window.alert = jest.fn();

      // render UI
      document.body.innerHTML = NewBillUI();

      // instancie le container NewBill
      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // récupère l'input file
      const fileInput = screen.getByTestId("file");

      // crée un fichier invalide (.pdf)
      const invalidFile = new File(["dummy"], "facture.pdf", {
        type: "application/pdf",
      });

      // déclenche le change
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      // assertions
      expect(window.alert).toHaveBeenCalled(); // fichier refusé => alert
      expect(fileInput.value).toBe("");
      expect(newBill.fileName).toBeNull();
      expect(newBill.fileUrl).toBeNull();
      expect(newBill.billId).toBeNull();
    });
  });
});
