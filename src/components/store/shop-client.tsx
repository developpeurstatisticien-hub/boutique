"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { saveCart, useCart } from "@/lib/cart";
import { formatPrice, StoreProduct } from "@/lib/products";

type ShopCategory = { id: string; name: string };

export default function ShopClient({ products, categories }: { products: StoreProduct[]; categories: ShopCategory[] }) {
  const [activeCategory, setActiveCategory] = useState("Tout voir");
  const [query, setQuery] = useState("");
  const cart = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return products.filter((product) => {
      const categoryMatches = activeCategory === "Tout voir" || product.category === activeCategory;
      const queryMatches =
        !normalizedQuery ||
        `${product.name} ${product.description} ${product.category}`
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery);
      return categoryMatches && queryMatches;
    });
  }, [activeCategory, products, query]);

  const cartLines = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.id);
    return product ? [{ ...line, product }] : [];
  });
  const cartCount = cartLines.reduce((count, line) => count + line.quantity, 0);
  const cartTotal = cartLines.reduce(
    (total, line) => total + line.product.price * line.quantity,
    0,
  );

  function addToCart(productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product || product.stock === 0) return;
    const nextCart = [...cart];
    const existing = nextCart.find((line) => line.id === productId);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + 1, product.stock);
    } else {
      nextCart.push({ id: productId, quantity: 1 });
    }
    saveCart(nextCart);
    setCartOpen(true);
  }

  function changeQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      saveCart(cart.filter((line) => line.id !== productId));
      return;
    }
    const product = products.find((item) => item.id === productId);
    if (!product || product.stock <= 0) return;
    saveCart(cart.map((line) =>
      line.id === productId
        ? { ...line, quantity: Math.min(quantity, product.stock, 99) }
        : line,
    ));
  }

  return (
    <main className="store">
      <div className="announcement">
        Livraison offerte dès 1 000 MRU d’achat <span aria-hidden="true">✳</span> Des pièces choisies avec soin
      </div>
      <header className="store-header">
        <Link className="brand" href="/" aria-label="Noma Atelier, accueil">
          <Image className="brand__logo" src="/balkissa-beauty-house.png" alt="" width={768} height={768} />
          <span className="brand__name">NOMA <span>ATELIER</span></span>
        </Link>
        <nav className="store-nav" aria-label="Navigation principale">
          <a href="#collection">La collection</a>
          <a href="#histoire">Notre histoire</a>
        </nav>
        <button className="cart-trigger" onClick={() => setCartOpen(true)} aria-label={`Ouvrir le panier, ${cartCount} article(s)`}>
          Panier <span className="cart-trigger__count">{cartCount}</span>
        </button>
      </header>

      <section className="shop-hero">
        <div className="shop-hero__copy">
          <p className="eyebrow"><span /> L’ART DE CHOISIR</p>
          <h1>Les belles choses<br /><em>restent.</em></h1>
          <p>Des objets, des matières, des idées. Une collection faite pour durer et pour vous accompagner.</p>
          <a className="text-link" href="#collection">Explorer la collection <span aria-hidden="true">↓</span></a>
        </div>
        <div className="shop-hero__image" role="img" aria-label="Une sélection de pièces intemporelles" />
        <div className="shop-hero__label"><span>01</span> ÉDITION PRINTEMPS · ÉTÉ</div>
      </section>

      <section className="collection section-wrap" id="collection">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> SÉLECTION NOMA</p>
            <h2>La collection</h2>
          </div>
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une pièce"
              aria-label="Rechercher un produit"
            />
          </label>
        </div>

        <div className="collection-toolbar">
          <div className="category-list" aria-label="Filtrer par catégorie">
            {["Tout voir", ...categories.map((category) => category.name)].map((category) => (
              <button
                key={category}
                className={`category-chip${activeCategory === category ? " category-chip--active" : ""}`}
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
              >
                {category}
              </button>
            ))}
          </div>
          <span className="result-count">{visibleProducts.length} pièces</span>
        </div>

        <div className="product-grid">
          {visibleProducts.map((product, index) => (
            <article className="product-card" key={product.id}>
              <div
                className="product-card__image"
                style={{ backgroundImage: `url("${product.image}")` }}
                role="img"
                aria-label={`${product.name}, couleur ${product.color}`}
              >
                {product.tag && <span className="product-tag">{product.tag}</span>}
                {product.stock === 0 && <span className="product-tag product-tag--sold">Épuisé</span>}
                <button
                  className="quick-add"
                  onClick={() => addToCart(product.id)}
                  disabled={product.stock === 0}
                  aria-label={`Ajouter ${product.name} au panier`}
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
              <div className="product-card__details">
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.color} · {product.category}</p>
                </div>
                <div className="product-card__price">
                  {product.previousPrice && <s>{formatPrice(product.previousPrice)}</s>}
                  <strong>{formatPrice(product.price)}</strong>
                </div>
              </div>
              <p className="product-card__description">{product.description}</p>
              <span className={`stock-note${product.stock === 0 ? " stock-note--empty" : ""}`}>
                {product.stock === 0 ? "Indisponible" : product.stock <= 5 ? `Plus que ${product.stock} en stock` : "En stock"}
              </span>
              <span className="product-card__number">0{index + 1}</span>
            </article>
          ))}
        </div>
        {visibleProducts.length === 0 && (
          <div className="empty-results">
            <span aria-hidden="true">⌕</span>
            <p>Aucune pièce ne correspond à votre recherche.</p>
            <button className="text-link" onClick={() => { setQuery(""); setActiveCategory("Tout voir"); }}>Réinitialiser les filtres</button>
          </div>
        )}
      </section>

      <section className="story" id="histoire">
        <p className="eyebrow eyebrow--light"><span /> NOTRE PHILOSOPHIE</p>
        <p className="story__quote">« Moins, mais mieux. Et surtout, <em>plus vous.</em> »</p>
        <Link className="story__link" href="/">Découvrir Noma Atelier <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className="store-footer">
        <Link className="brand" href="/">
          <Image className="brand__logo" src="/balkissa-beauty-house.png" alt="" width={768} height={768} />
          <span className="brand__name">NOMA <span>ATELIER</span></span>
        </Link>
        <span>© 2026 Noma Atelier · Une sélection singulière.</span>
        <a href="mailto:bonjour@noma-atelier.fr">Nous contacter</a>
      </footer>

      {cartOpen && (
        <div className="drawer-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCartOpen(false);
        }}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <div className="cart-drawer__heading">
              <div>
                <p className="eyebrow"><span /> VOTRE SÉLECTION</p>
                <h2 id="cart-title">Le panier <span>({cartCount})</span></h2>
              </div>
              <button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Fermer le panier">×</button>
            </div>
            {cartLines.length === 0 ? (
              <div className="cart-empty"><p>Votre panier attend sa première belle trouvaille.</p><button className="text-link" onClick={() => setCartOpen(false)}>Continuer mes découvertes</button></div>
            ) : (
              <>
                <div className="cart-lines">
                  {cartLines.map((line) => {
                    const { product } = line;
                    const maximumQuantity = Math.min(product.stock, 99);
                    return (
                      <div className="cart-line" key={line.id}>
                        <div className="cart-line__image" style={{ backgroundImage: `url("${product.image}")` }} />
                        <div className="cart-line__info">
                          <strong>{product.name}</strong>
                          <span>{product.color}</span>
                          {product.stock === 0 ? (
                            <span className="cart-line__unavailable">Indisponible</span>
                          ) : (
                            <div className="cart-quantity" aria-label={`Quantité de ${product.name}`}>
                              <button
                                type="button"
                                onClick={() => changeQuantity(line.id, line.quantity - 1)}
                                aria-label={`Retirer une unité de ${product.name}`}
                              >−</button>
                              <span aria-live="polite">{line.quantity}</span>
                              <button
                                type="button"
                                onClick={() => changeQuantity(line.id, line.quantity + 1)}
                                disabled={line.quantity >= maximumQuantity}
                                aria-label={`Ajouter une unité de ${product.name}`}
                              >+</button>
                            </div>
                          )}
                        </div>
                        <div className="cart-line__end">
                          <strong>{formatPrice(product.price * line.quantity)}</strong>
                          <button
                            className="cart-line__remove"
                            type="button"
                            onClick={() => changeQuantity(line.id, 0)}
                            aria-label={`Retirer ${product.name} du panier`}
                          >Retirer</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="cart-total"><span>Sous-total</span><strong>{formatPrice(cartTotal)}</strong></div>
                <p className="cart-disclaimer">Livraison et éventuels frais calculés à la commande.</p>
                <Link className="button button--dark cart-checkout" href="/commande">Passer commande <span aria-hidden="true">↗</span></Link>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
