// ============================================================
// ATURKU — PENCATATAN PEMASUKAN DAN PENGELUARAN
// File JavaScript: fungsi dan logika aplikasi
// ============================================================

// ---------- Elemen dan informasi tanggal ----------
const $ = (id) => document.getElementById(id);

const now = new Date();

const localISO = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const today = localISO(now);
const thisMonth = today.slice(0, 7);
const STORE = "aturku_cashflow_v1";

// ---------- Fungsi pembantu ----------
const money = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const safe = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));

// ---------- Kategori transaksi ----------
const categories = {
  income: [
    "Gaji",
    "Penjualan",
    "Bonus",
    "Freelance",
    "Usaha",
    "Hadiah",
    "Lainnya",
  ],
  expense: [
    "Makanan",
    "Transportasi",
    "Tagihan",
    "Kebutuhan",
    "Kuliah",
    "Kesehatan",
    "Hiburan",
    "Operasional",
    "Belanja",
    "Lainnya",
  ],
};

let transactions = [];
let type = "income";
let editingId = null;

// ---------- Memuat data dari penyimpanan browser ----------
try {
  const savedData = JSON.parse(localStorage.getItem(STORE));

  if (Array.isArray(savedData)) {
    transactions = savedData;
  } else if (savedData && Array.isArray(savedData.transactions)) {
    transactions = savedData.transactions;
  }
} catch (error) {
  // Jika data tidak bisa dibaca, aplikasi dimulai dengan daftar kosong.
}

// ---------- Menyimpan data dan menampilkan pesan ----------
function persist() {
  localStorage.setItem(STORE, JSON.stringify(transactions));
}

function notify(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2300);
}

// ---------- Memilih jenis transaksi ----------
function setType(value) {
  type = value;

  $("incomeTab").classList.toggle("active", value === "income");
  $("expenseTab").classList.toggle("active", value === "expense");

  $("formHeading").textContent = editingId
    ? "Edit transaksi"
    : value === "income"
      ? "Tambah pemasukan"
      : "Tambah pengeluaran";

  $("saveButton").textContent = editingId
    ? "Simpan perubahan"
    : value === "income"
      ? "Simpan pemasukan"
      : "Simpan pengeluaran";

  $("category").innerHTML = categories[value]
    .map((category) => `<option>${category}</option>`)
    .join("");
}

// ---------- Menyiapkan pilihan bulan pada filter ----------
function updateMonthOptions() {
  const monthFilter = $("monthFilter");
  const previousMonth = monthFilter.value || thisMonth;

  const months = new Set([
    thisMonth,
    ...transactions.map((transaction) => transaction.date.slice(0, 7)),
  ]);

  // Tambahkan 17 bulan sebelumnya agar bisa dipilih melalui filter.
  for (let i = 1; i < 18; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.add(localISO(date).slice(0, 7));
  }

  const sortedMonths = [...months].sort((a, b) => b.localeCompare(a));

  monthFilter.innerHTML =
    '<option value="all">Semua bulan</option>' +
    sortedMonths
      .map((month) => {
        const date = new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5)) - 1,
          1
        );

        const label = date.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        });

        return `<option value="${month}">${label}</option>`;
      })
      .join("");

  monthFilter.value =
    previousMonth === "all"
      ? "all"
      : sortedMonths.includes(previousMonth)
        ? previousMonth
        : thisMonth;
}

// ---------- Memperbarui dashboard dan riwayat transaksi ----------
function render() {
  updateMonthOptions();

  const selectedMonth = $("monthFilter").value || "all";
  const selectedType = $("typeFilter").value;
  const searchText = $("search").value.toLowerCase();

  const monthTransactions = transactions.filter(
    (transaction) =>
      selectedMonth === "all" ||
      transaction.date.startsWith(selectedMonth)
  );

  const incomes = monthTransactions.filter(
    (transaction) => transaction.type === "income"
  );

  const expenses = monthTransactions.filter(
    (transaction) => transaction.type === "expense"
  );

  const sumAmounts = (items) =>
    items.reduce(
      (total, transaction) => total + Number(transaction.amount || 0),
      0
    );

  const totalIncome = sumAmounts(incomes);
  const totalExpense = sumAmounts(expenses);
  const balance = totalIncome - totalExpense;

  $("totalIncome").textContent = money(totalIncome);
  $("totalExpense").textContent = money(totalExpense);
  $("netBalance").textContent = money(balance);
  $("netBalance").style.color =
    balance < 0 ? "var(--red)" : "var(--ink)";

  $("sideBalance").textContent = money(balance);
  $("countIncome").textContent = `${incomes.length} transaksi`;
  $("countExpense").textContent = `${expenses.length} transaksi`;
  $("countAll").textContent = `${monthTransactions.length} transaksi`;

  const visibleTransactions = monthTransactions
    .filter((transaction) => {
      const matchesType =
        selectedType === "all" || transaction.type === selectedType;

      const searchableText =
        `${transaction.description} ${transaction.category}`.toLowerCase();

      return matchesType && searchableText.includes(searchText);
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    );

  $("transactionRows").innerHTML = visibleTransactions.length
    ? visibleTransactions
        .map(
          (transaction) => `
            <tr>
              <td>${safe(transaction.date)}</td>
              <td>
                <div class="desc">${safe(transaction.description)}</div>
                <div class="category">${safe(transaction.category)}</div>
              </td>
              <td>
                <span class="pill ${transaction.type}">
                  ${transaction.type === "income" ? "Pemasukan" : "Pengeluaran"}
                </span>
              </td>
              <td class="amount ${transaction.type}">
                ${transaction.type === "income" ? "+" : "−"}${money(transaction.amount)}
              </td>
              <td>
                <div class="actions">
                  <button
                    class="btn light small"
                    onclick="editTransaction('${transaction.id}')"
                  >
                    Edit
                  </button>
                  <button
                    class="btn danger small"
                    onclick="deleteTransaction('${transaction.id}')"
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : `
        <tr>
          <td colspan="5" class="empty">
            Belum ada transaksi yang cocok. Tambahkan melalui formulir.
          </td>
        </tr>
      `;
}

// ---------- Mengatur periode laporan ----------
function setReportMonth() {
  const date = new Date();
  const firstDayOfMonth = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

  $("reportFrom").value = localISO(firstDayOfMonth);
  $("reportTo").value = today;

  renderReport();
}

// ---------- Membuat isi laporan keuangan ----------
function renderReport() {
  const fromDate = $("reportFrom").value || "0000-01-01";
  const toDate = $("reportTo").value || "9999-12-31";

  const reportTransactions = transactions
    .filter(
      (transaction) =>
        transaction.date >= fromDate && transaction.date <= toDate
    )
    .slice()
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
    );

  const totalIncome = reportTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (total, transaction) => total + Number(transaction.amount || 0),
      0
    );

  const totalExpense = reportTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (total, transaction) => total + Number(transaction.amount || 0),
      0
    );

  const balance = totalIncome - totalExpense;

  $("reportIncome").textContent = money(totalIncome);
  $("reportExpense").textContent = money(totalExpense);
  $("reportBalance").textContent = money(balance);
  $("reportBalance").style.color =
    balance < 0 ? "var(--red)" : "var(--ink)";
  $("reportCount").textContent = `${reportTransactions.length} transaksi`;

  const formatDate = (dateValue) =>
    dateValue
      ? new Date(`${dateValue}T00:00:00`).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  $("printPeriod").textContent =
    `Periode: ${formatDate($("reportFrom").value)} ` +
    `sampai ${formatDate($("reportTo").value)}`;

  $("printDate").textContent = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  $("reportRows").innerHTML = reportTransactions.length
    ? reportTransactions
        .map(
          (transaction) => `
            <tr>
              <td>${safe(transaction.date)}</td>
              <td>
                <div class="desc">${safe(transaction.description)}</div>
              </td>
              <td>${safe(transaction.category)}</td>
              <td>
                ${transaction.type === "income" ? "Pemasukan" : "Pengeluaran"}
              </td>
              <td class="amount ${transaction.type}">
                ${transaction.type === "income" ? "+" : "−"}${money(transaction.amount)}
              </td>
              <td class="no-print">
                <button
                  class="btn light small"
                  onclick="editTransaction('${transaction.id}')"
                >
                  Edit
                </button>
              </td>
            </tr>
          `
        )
        .join("")
    : `
        <tr>
          <td colspan="6" class="empty">
            Tidak ada transaksi pada periode ini.
          </td>
        </tr>
      `;
}

// ---------- Navigasi menu samping ----------
function focusSection(id, button) {
  document.querySelectorAll(".side-nav button").forEach((menuButton) => {
    menuButton.classList.toggle("active", menuButton === button);
  });

  const target = $(id);

  if (target) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (button && button.textContent.includes("Pemasukan")) {
    setType("income");
  }
}

// ---------- Mengosongkan formulir ----------
function resetForm() {
  $("transactionForm").reset();
  $("date").value = today;
  $("cancelEdit").style.display = "none";

  editingId = null;

  setType("income");
}

// ---------- Menyimpan transaksi dari formulir ----------
$("transactionForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const description = $("description").value.trim();
  const amount = Number($("amount").value);

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    notify("Periksa deskripsi dan nominal.");
    return;
  }

  const transaction = {
    id:
      editingId ||
      "tx_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    date: $("date").value,
    description,
    category: $("category").value,
    type,
    amount,
  };

  transactions = editingId
    ? transactions.map((item) =>
        item.id === editingId ? transaction : item
      )
    : [...transactions, transaction];

  persist();
  resetForm();
  render();
  notify("Transaksi berhasil disimpan.");
});

// ---------- Mengisi formulir untuk mengedit transaksi ----------
function editTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);

  if (!transaction) {
    return;
  }

  editingId = id;

  setType(transaction.type);

  $("date").value = transaction.date;
  $("description").value = transaction.description;
  $("category").value = transaction.category;
  $("amount").value = transaction.amount;

  $("formHeading").textContent = "Edit transaksi";
  $("saveButton").textContent = "Simpan perubahan";
  $("cancelEdit").style.display = "block";

  document.querySelector(".layout .panel").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// ---------- Membatalkan edit dan menghapus transaksi ----------
function cancelEdit() {
  resetForm();
}

function deleteTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);

  if (
    !transaction ||
    !confirm(`Hapus transaksi "${transaction.description}"?`)
  ) {
    return;
  }

  transactions = transactions.filter((item) => item.id !== id);

  if (editingId === id) {
    resetForm();
  }

  persist();
  render();
  notify("Transaksi dihapus.");
}

// ---------- Membuat file unduhan ----------
function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function download(filename, content, mimeType) {
  const blob = new Blob(["\ufeff" + content], {
    type: mimeType,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// ---------- Mengekspor transaksi ke CSV ----------
function exportCSV() {
  const rows = [
    ["Tanggal", "Deskripsi", "Kategori", "Jenis", "Nominal (Rp)"],
    ...transactions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((transaction) => [
        transaction.date,
        transaction.description,
        transaction.category,
        transaction.type === "income" ? "Pemasukan" : "Pengeluaran",
        transaction.amount,
      ]),
  ];

  const csvContent = rows
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  download(
    "aturku-pemasukan-pengeluaran.csv",
    csvContent,
    "text/csv;charset=utf-8"
  );

  notify("File CSV berhasil dibuat.");
}

// ---------- Membuat cadangan data dalam format JSON ----------
function backupJSON() {
  const backup = {
    version: 1,
    transactions,
  };

  download(
    `aturku-cadangan-${today}.json`,
    JSON.stringify(backup, null, 2),
    "application/json"
  );

  notify("Cadangan JSON berhasil dibuat.");
}

// ---------- Memulihkan data dari file cadangan JSON ----------
function restoreJSON(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsedData = JSON.parse(reader.result);
      const restoredTransactions = Array.isArray(parsedData)
        ? parsedData
        : parsedData.transactions;

      const invalidData =
        !Array.isArray(restoredTransactions) ||
        restoredTransactions.some(
          (transaction) =>
            !transaction.date ||
            !transaction.description ||
            !["income", "expense"].includes(transaction.type) ||
            !Number.isFinite(Number(transaction.amount))
        );

      if (invalidData) {
        throw Error("Format cadangan tidak valid.");
      }

      if (!confirm("Ganti seluruh catatan dengan isi cadangan?")) {
        return;
      }

      transactions = restoredTransactions.map((transaction) => ({
        ...transaction,
        id: String(
          transaction.id || "tx_" + Math.random().toString(36).slice(2)
        ),
        amount: Number(transaction.amount),
      }));

      persist();
      render();
      notify("Cadangan berhasil dipulihkan.");
    } catch (error) {
      alert("File bukan cadangan AturKu yang valid.");
    }

    event.target.value = "";
  };

  reader.readAsText(file);
}

// ---------- Inisialisasi aplikasi saat halaman dibuka ----------
$("dateLabel").textContent = now.toLocaleDateString("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

$("date").value = today;

$("reportFrom").value = localISO(
  new Date(now.getFullYear(), now.getMonth(), 1)
);

$("reportTo").value = today;

setType("income");
render();
renderReport();
