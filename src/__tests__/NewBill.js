/**
 * @jest-environment jsdom
 */

import { screen } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";

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
  });
});
