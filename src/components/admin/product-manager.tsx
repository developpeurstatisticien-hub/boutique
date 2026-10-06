"use client";

import { FormEvent, useState } from "react";

type Category = { id: string; name: string; slug: string; isActive: boolean; productCount: number };
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice: number | null;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  isActive: boolean;
};

async function readResponse(response: Response) {
  const result = await response.json() as Record<string, unknown> & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "L’opération a échoué.");
  return result;
}

async function uploadImage(file: File) {
  const signed = await readResponse(await fetch("/api/admin/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "image", contentType: file.type, size: file.size }),
  })) as { uploadUrl: string; headers: Record<string, string>; mediaUrl: string };
  const response = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: signed.headers,
    body: file,
  });
  if (!response.ok) throw new Error("L’envoi de la photo vers le stockage a échoué.");
  return signed;
}

export function ProductManager({ categories: initialCategories, products: initialProducts }: {
  categories: Category[];
  products: Product[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<Product | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      let imageUrl = String(form.get("imageUrl") ?? "").trim();
      const file = form.get("imageFile");
      if (file instanceof File && file.size > 0) {
        const uploaded = await uploadImage(file);
        imageUrl = uploaded.mediaUrl;
      }
      if (!imageUrl) throw new Error("Choisissez une photo ou indiquez une URL d’image.");

      const body = {
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        price: Number(form.get("price")),
        promoPrice: String(form.get("promoPrice") ?? "").trim() ? Number(form.get("promoPrice")) : null,
        stock: Number(form.get("stock")),
        categoryId: String(form.get("categoryId") ?? ""),
        imageUrl,
        isActive: form.get("isActive") === "on",
      };
      const url = editing ? `/api/admin/produits/${editing.id}` : "/api/admin/produits";
      const result = await readResponse(await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
      const saved = result.product as {
        id: string; name: string; description: string; price: string | number;
        promoPrice: string | number | null; stock: number; categoryId: string;
        category: { name: string }; images: { mediaUrl: string }[]; isActive: boolean;
      };
      const product: Product = {
        id: saved.id, name: saved.name, description: saved.description,
        price: typeof saved.price === "number" ? saved.price : Number(saved.price),
        promoPrice: saved.promoPrice === null ? null : typeof saved.promoPrice === "number" ? saved.promoPrice : Number(saved.promoPrice),
        stock: saved.stock, categoryId: saved.categoryId, categoryName: saved.category.name,
        imageUrl: saved.images[0]?.mediaUrl ?? "", isActive: saved.isActive,
      };
      setProducts((current) => editing ? current.map((item) => item.id === product.id ? product : item) : [product, ...current]);
      setEditing(null);
      formElement.reset();
      setMessage(editing ? "Produit modifié." : "Produit ajouté.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d’enregistrer le produit.");
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Supprimer le produit « ${product.name} » ?`)) return;
    setError("");
    try {
      await readResponse(await fetch(`/api/admin/produits/${product.id}`, { method: "DELETE" }));
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setMessage("Produit supprimé.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de supprimer le produit.");
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const result = await readResponse(await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName, isActive: true }),
      }));
      const saved = result.category as Category;
      setCategories((current) => [...current, { ...saved, productCount: 0 }].sort((a, b) => a.name.localeCompare(b.name, "fr")));
      setCategoryName("");
      setMessage("Catégorie ajoutée.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d’ajouter la catégorie.");
    }
  }

  async function toggleCategory(category: Category) {
    setError("");
    try {
      const result = await readResponse(await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: category.name, isActive: !category.isActive }),
      }));
      const saved = result.category as Category;
      setCategories((current) => current.map((item) => item.id === category.id ? { ...item, isActive: saved.isActive } : item));
      setMessage(saved.isActive ? "Catégorie activée." : "Catégorie désactivée.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de modifier la catégorie.");
    }
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`Supprimer la catégorie « ${category.name} » ?`)) return;
    setError("");
    try {
      await readResponse(await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" }));
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setMessage("Catégorie supprimée.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de supprimer la catégorie.");
    }
  }

  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><p className="eyebrow"><span /> CATALOGUE</p><h2>{editing ? "Modifier un produit" : "Ajouter un produit"}</h2></div><span>{products.length} produit(s)</span></div>
        {!categories.some((category) => category.isActive) ? (
          <p className="admin-empty">Créez ou réactivez une catégorie pour pouvoir ajouter des produits.</p>
        ) : (
          <form key={editing?.id ?? "new"} className="admin-product-form" onSubmit={saveProduct}>
            <div className="admin-form-grid">
              <label>Nom du produit<input name="name" defaultValue={editing?.name ?? ""} required maxLength={120} /></label>
              <label>Catégorie<select name="categoryId" defaultValue={editing?.categoryId ?? categories.find((item) => item.isActive)?.id ?? ""} required>
                {categories.filter((category) => category.isActive || category.id === editing?.categoryId).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select></label>
              <label>Prix (MRU)<input name="price" type="number" min="1" step="0.01" defaultValue={editing?.price ?? ""} required /></label>
              <label>Prix promotionnel (MRU)<input name="promoPrice" type="number" min="0.01" step="0.01" defaultValue={editing?.promoPrice ?? ""} /></label>
              <label>Stock disponible<input name="stock" type="number" min="0" step="1" defaultValue={editing?.stock ?? 0} required /></label>
              <label>Photo du produit (JPG, PNG, WEBP)<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp" /></label>
              <label className="admin-form-grid__wide">Description<textarea name="description" rows={3} defaultValue={editing?.description ?? ""} required maxLength={2000} /></label>
              <label className="admin-form-grid__wide">Ou URL d’image<input name="imageUrl" type="url" defaultValue={editing?.imageUrl ?? ""} placeholder="https://…" /></label>
              <label className="admin-checkbox"><input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} /> Produit visible dans la boutique</label>
            </div>
            <div className="admin-form-actions">
              <button className="button button--dark" disabled={busy}>{busy ? "Enregistrement…" : editing ? "Enregistrer les changements" : "Ajouter le produit"}</button>
              {editing && <button type="button" className="admin-secondary-button" onClick={() => setEditing(null)}>Annuler</button>}
            </div>
          </form>
        )}
        {error && <p className="admin-form-message admin-form-message--error" role="alert">{error}</p>}
        {message && <p className="admin-form-message" role="status">{message}</p>}
      </section>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><p className="eyebrow"><span /> ARTICLES ENREGISTRÉS</p><h2>Votre catalogue</h2></div></div>
        {products.length === 0 ? <p className="admin-empty">Aucun produit pour le moment.</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Visibilité</th><th>Actions</th></tr></thead>
              <tbody>{products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td><td>{product.categoryName}</td>
                  <td>{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MRU" }).format(product.promoPrice ?? product.price)}</td>
                  <td>{product.stock}</td><td>{product.isActive ? "Actif" : "Masqué"}</td>
                  <td><button className="admin-table-action" onClick={() => setEditing(product)}>Modifier</button> <button className="admin-table-action admin-table-action--danger" onClick={() => void removeProduct(product)}>Supprimer</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><p className="eyebrow"><span /> ORGANISATION</p><h2>Catégories</h2></div></div>
        <form className="admin-inline-form" onSubmit={createCategory}>
          <label>Nouvelle catégorie<input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} maxLength={80} required placeholder="Ex. Accessoires" /></label>
          <button className="admin-secondary-button">Ajouter une catégorie</button>
        </form>
        {categories.length > 0 && <div className="admin-category-list">{categories.map((category) => (
          <div className="admin-category-row" key={category.id}>
            <div><strong>{category.name}</strong><span>{category.productCount} produit(s) · {category.isActive ? "Visible" : "Masquée"}</span></div>
            <button className="admin-table-action" onClick={() => void toggleCategory(category)}>{category.isActive ? "Désactiver" : "Activer"}</button>
            <button className="admin-table-action admin-table-action--danger" onClick={() => void removeCategory(category)}>Supprimer</button>
          </div>
        ))}</div>}
      </section>
    </>
  );
}
