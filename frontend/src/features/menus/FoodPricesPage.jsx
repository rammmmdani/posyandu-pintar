import { useCallback, useEffect, useState } from "react";
import {
  addFoodPrice,
  createFoodItem,
  getFoodItems,
  setFoodActive,
} from "../../services/foodService";
import { getErrorMessage } from "../../utils/errors";
import { formatDate, todayISO } from "../../utils/format";
import { ALLERGEN_LABEL, FOOD_GROUP_LABEL, rupiah } from "./menuLabels";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Checkbox from "../../components/ui/Checkbox";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import { useToast } from "../../components/ui/Toast";

const numberOrNull = (s) => {
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  return t === "" ? null : Number(t);
};

export default function FoodPricesPage() {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: "", rows: [] });
  const [priceFor, setPriceFor] = useState(null);
  const [price, setPrice] = useState({
    value: "",
    date: todayISO(),
    source: "",
  });
  const [priceError, setPriceError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [food, setFood] = useState({
    name: "",
    unit: "kg",
    food_group: "makanan_pokok",
    tags: [],
    price: "",
  });
  const [foodErrors, setFoodErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getFoodItems();
      setState({ loading: false, error: "", rows: res.data });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err), rows: [] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savePrice = async () => {
    const value = numberOrNull(price.value);
    if (value === null || Number.isNaN(value) || value < 0) {
      setPriceError("Isi harga berupa angka");
      return;
    }
    if (price.date > todayISO()) {
      setPriceError("Tanggal tidak boleh di masa depan");
      return;
    }
    setBusy(true);
    try {
      await addFoodPrice(priceFor.id, {
        price: value,
        effective_date: price.date,
        source: price.source.trim() || null,
      });
      toast.success("Harga diperbarui");
      setPriceFor(null);
      await load();
    } catch (err) {
      setPriceError(
        err.response?.data?.errors?.[0]?.message || getErrorMessage(err),
      );
    } finally {
      setBusy(false);
    }
  };

  const saveFood = async () => {
    const e = {};
    if (!food.name.trim()) e.name = "Nama bahan wajib diisi";
    const p = numberOrNull(food.price);
    if (p !== null && (Number.isNaN(p) || p < 0))
      e.price = "Isi harga berupa angka";
    setFoodErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await createFoodItem({
        name: food.name.trim(),
        unit: food.unit,
        food_group: food.food_group,
        allergen_tags: food.tags,
        ...(p !== null
          ? { price: p, price_source: "Dicatat koordinator" }
          : {}),
      });
      toast.success("Bahan ditambahkan");
      setAddOpen(false);
      setFood({
        name: "",
        unit: "kg",
        food_group: "makanan_pokok",
        tags: [],
        price: "",
      });
      await load();
    } catch (err) {
      const body = err.response?.data;
      if (body?.errors?.length)
        setFoodErrors(
          Object.fromEntries(body.errors.map((x) => [x.field, x.message])),
        );
      else toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (f) => {
    try {
      await setFoodActive(f.id, !f.is_active);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    {
      key: "name",
      header: "Bahan",
      render: (f) => (
        <span
          className={f.is_active ? "font-semibold" : "text-redam line-through"}
        >
          {f.name}
        </span>
      ),
    },
    {
      key: "group",
      header: "Kelompok",
      render: (f) => (
        <span className="text-xs">{FOOD_GROUP_LABEL[f.food_group]}</span>
      ),
    },
    {
      key: "tags",
      header: "Alergen",
      render: (f) =>
        f.allergen_tags.length
          ? f.allergen_tags.map((t) => ALLERGEN_LABEL[t]).join(", ")
          : "-",
    },
    {
      key: "price",
      header: "Harga terbaru",
      render: (f) =>
        f.price ? (
          <span>
            {rupiah(f.price.value)} / {f.unit}
            <br />
            <span className="text-xs text-redam">
              {formatDate(f.price.date)}
            </span>{" "}
            {f.price.stale && <Badge tone="perhatian">Perlu diperbarui</Badge>}
          </span>
        ) : (
          <Badge tone="perhatian">Belum ada harga</Badge>
        ),
    },
    {
      key: "action",
      header: "",
      render: (f) => (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setPriceFor(f);
              setPrice({ value: "", date: todayISO(), source: "" });
              setPriceError("");
            }}
          >
            Perbarui harga
          </Button>
          <Button variant="ghost" onClick={() => toggle(f)}>
            {f.is_active ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Harga Bahan</h1>
        <Button
          onClick={() => {
            setFoodErrors({});
            setAddOpen(true);
          }}
        >
          Tambah bahan
        </Button>
      </div>
      <Alert tone="info">
        Harga dicatat manual dan dipakai untuk memperkirakan biaya menu.
        Perbarui secara berkala. Harga yang lebih dari 30 hari ditandai agar
        kader tahu bahwa perkiraan biaya mungkin sudah berubah.
      </Alert>

      {state.error ? (
        <Alert tone="error">{state.error}</Alert>
      ) : (
        <Table
          columns={columns}
          rows={state.rows}
          loading={state.loading}
          emptyTitle="Belum ada bahan"
        />
      )}

      <Modal
        open={priceFor !== null}
        onClose={() => setPriceFor(null)}
        title={priceFor ? `Perbarui harga ${priceFor.name}` : ""}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPriceFor(null)}
              disabled={busy}
            >
              Batal
            </Button>
            <Button onClick={savePrice} loading={busy}>
              Simpan harga
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label={`Harga (Rp per ${priceFor?.unit ?? ""})`}
            inputMode="numeric"
            value={price.value}
            onChange={(e) => {
              setPrice({ ...price, value: e.target.value });
              setPriceError("");
            }}
            error={priceError}
          />
          <Input
            label="Tanggal berlaku"
            type="date"
            max={todayISO()}
            value={price.date}
            onChange={(e) => setPrice({ ...price, date: e.target.value })}
          />
          <Input
            label="Sumber harga (opsional)"
            value={price.source}
            onChange={(e) => setPrice({ ...price, source: e.target.value })}
            hint="Contoh: pasar dekat Posyandu"
          />
        </div>
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah bahan"
        wide
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAddOpen(false)}
              disabled={busy}
            >
              Batal
            </Button>
            <Button onClick={saveFood} loading={busy}>
              Simpan bahan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nama bahan"
            value={food.name}
            onChange={(e) => {
              setFood({ ...food, name: e.target.value });
              setFoodErrors({ ...foodErrors, name: undefined });
            }}
            error={foodErrors.name}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Satuan harga"
              value={food.unit}
              onChange={(e) => setFood({ ...food, unit: e.target.value })}
            >
              <option value="kg">per kg</option>
              <option value="l">per liter</option>
              <option value="butir">per butir</option>
            </Select>
            <Input
              label="Harga (Rp, opsional)"
              inputMode="numeric"
              value={food.price}
              onChange={(e) => setFood({ ...food, price: e.target.value })}
              error={foodErrors.price}
            />
          </div>
          <Select
            label="Kelompok pangan"
            value={food.food_group}
            onChange={(e) => setFood({ ...food, food_group: e.target.value })}
            error={foodErrors.food_group}
          >
            {Object.entries(FOOD_GROUP_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              Mengandung alergen
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(ALLERGEN_LABEL).map(([k, v]) => (
                <Checkbox
                  key={k}
                  label={v}
                  checked={food.tags.includes(k)}
                  onChange={(e) =>
                    setFood({
                      ...food,
                      tags: e.target.checked
                        ? [...food.tags, k]
                        : food.tags.filter((t) => t !== k),
                    })
                  }
                />
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-redam">
            Pengelompokan dan tag alergen perlu dipastikan dengan ahli gizi.
          </p>
        </div>
      </Modal>
    </div>
  );
}
