(() => {
  const login = document.querySelector("[data-admin-login]");
  const board = document.querySelector("[data-admin-board]");
  const rows = document.querySelector("[data-admin-rows]");
  const count = document.querySelector("[data-admin-count]");
  const status = document.querySelector("[data-admin-status]");
  let adminKey = sessionStorage.getItem("almassira-admin") || "";

  const showStatus = (text, ok = false) => {
    if (!status) return;
    status.hidden = false;
    status.textContent = text;
    status.classList.toggle("is-ok", ok);
  };

  const load = async () => {
    const res = await fetch("/api/reservations", {
      headers: { "X-Admin-Key": adminKey },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Accès refusé.");
    const list = data.reservations || [];
    count.textContent = `${list.length} rendez-vous`;
    rows.innerHTML = list
      .map(
        (item) => `
        <tr>
          <td>${item.date}</td>
          <td>${item.heure}</td>
          <td>${item.nom}<br /><small>${item.email || ""}</small></td>
          <td><a href="tel:${item.telephone}">${item.telephone}</a></td>
          <td>${item.soin}${item.message ? `<br /><small>${item.message}</small>` : ""}</td>
          <td><span class="statut statut-${item.statut}">${item.statut.replace("_", " ")}</span></td>
          <td>
            <button type="button" data-id="${item.id}" data-statut="confirmee">Confirmer</button>
            <button type="button" data-id="${item.id}" data-statut="annulee">Annuler</button>
          </td>
        </tr>`
      )
      .join("");
  };

  login?.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminKey = new FormData(login).get("key");
    try {
      await load();
      sessionStorage.setItem("almassira-admin", adminKey);
      login.hidden = true;
      board.hidden = false;
    } catch (error) {
      showStatus(error.message);
    }
  });

  rows?.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-id]");
    if (!btn) return;
    await fetch(`/api/reservations/${btn.dataset.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ statut: btn.dataset.statut }),
    });
    await load();
  });

  if (adminKey) {
    load()
      .then(() => {
        login.hidden = true;
        board.hidden = false;
      })
      .catch(() => sessionStorage.removeItem("almassira-admin"));
  }
})();
