"use client";

import { FormEvent, useState } from "react";

type Video = { id: string; title: string; mediaUrl: string; objectKey: string; isActive: boolean; sortOrder: number };

async function readResponse(response: Response) {
  const result = await response.json() as Record<string, unknown> & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "L’opération a échoué.");
  return result;
}

export function VideoManager({ videos: initialVideos }: { videos: Video[] }) {
  const [videos, setVideos] = useState(initialVideos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    const signed = await readResponse(await fetch("/api/admin/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "video", contentType: file.type, size: file.size }),
    })) as { uploadUrl: string; headers: Record<string, string>; mediaUrl: string; objectKey: string };
    const response = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: signed.headers,
      body: file,
    });
    if (!response.ok) throw new Error("L’envoi de la vidéo vers le stockage a échoué.");
    return { mediaUrl: signed.mediaUrl, objectKey: signed.objectKey };
  }

  async function createVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData(formElement);
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) throw new Error("Choisissez une vidéo à envoyer.");
      const uploaded = await upload(file);
      const result = await readResponse(await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: String(form.get("title") ?? ""), ...uploaded, isActive: form.get("isActive") === "on" }),
      }));
      const created = result.video as Video;
      setVideos((current) => [...current, created].sort((a, b) => a.sortOrder - b.sortOrder));
      formElement.reset();
      setMessage("Vidéo ajoutée à la page d’accueil.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d’ajouter la vidéo.");
    } finally {
      setBusy(false);
    }
  }

  async function updateVideo(video: Video, data: Partial<Video>, successMessage: string) {
    setError("");
    try {
      const result = await readResponse(await fetch(`/api/admin/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }));
      const saved = result.video as Video;
      setVideos((current) => current.map((item) => item.id === saved.id ? saved : item).sort((a, b) => a.sortOrder - b.sortOrder));
      setMessage(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de modifier la vidéo.");
    }
  }

  async function replaceVideo(video: Video, file: File) {
    setBusy(true);
    setError("");
    try {
      const uploaded = await upload(file);
      await updateVideo(video, uploaded, "Vidéo remplacée.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de remplacer la vidéo.");
    } finally {
      setBusy(false);
    }
  }

  async function removeVideo(video: Video) {
    if (!window.confirm(`Supprimer la vidéo « ${video.title} » ?`)) return;
    setError("");
    try {
      await readResponse(await fetch(`/api/admin/videos/${video.id}`, { method: "DELETE" }));
      setVideos((current) => current.filter((item) => item.id !== video.id));
      setMessage("Vidéo supprimée.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de supprimer la vidéo.");
    }
  }

  async function moveVideo(index: number, direction: -1 | 1) {
    const adjacentIndex = index + direction;
    if (adjacentIndex < 0 || adjacentIndex >= videos.length) return;
    setError("");
    try {
      const reordered = [...videos];
      [reordered[index], reordered[adjacentIndex]] = [reordered[adjacentIndex], reordered[index]];
      const response = await fetch("/api/admin/videos/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((video) => video.id) }),
      });
      await readResponse(response);
      setVideos(reordered.map((video, sortOrder) => ({ ...video, sortOrder })));
      setMessage("Ordre d’affichage mis à jour.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de modifier l’ordre.");
    }
  }

  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><p className="eyebrow"><span /> NOUVEAU CONTENU</p><h2>Ajouter une vidéo</h2></div></div>
        <form className="admin-product-form" onSubmit={createVideo}>
          <div className="admin-form-grid">
            <label>Titre de la vidéo<input name="title" maxLength={120} required placeholder="Ex. Collection printemps" /></label>
            <label>Fichier vidéo (MP4, WEBM ou MOV, max. 100 Mo)<input name="file" type="file" accept="video/mp4,video/webm,video/quicktime" required /></label>
            <label className="admin-checkbox"><input name="isActive" type="checkbox" defaultChecked /> Publier sur la page d’accueil</label>
          </div>
          <div className="admin-form-actions"><button className="button button--dark" disabled={busy}>{busy ? "Envoi en cours…" : "Ajouter la vidéo"}</button></div>
        </form>
        {error && <p className="admin-form-message admin-form-message--error" role="alert">{error}</p>}
        {message && <p className="admin-form-message" role="status">{message}</p>}
      </section>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><p className="eyebrow"><span /> MÉDIAS</p><h2>Vidéos enregistrées</h2></div><span>{videos.length} vidéo(s)</span></div>
        {videos.length === 0 ? <p className="admin-empty">Aucune vidéo. La page d’accueil utilise son visuel de présentation par défaut.</p> : (
          <div className="admin-video-list">{videos.map((video, index) => (
            <article className="admin-video-row" key={video.id}>
              <video className="admin-video-preview" src={video.mediaUrl} preload="metadata" controls />
              <div className="admin-video-info"><strong>{video.title}</strong><span>{video.isActive ? "Publiée sur la page d’accueil" : "Masquée"}</span><small>Position {index + 1}</small></div>
              <div className="admin-video-actions">
                <button className="admin-table-action" disabled={index === 0} onClick={() => void moveVideo(index, -1)} aria-label={`Déplacer ${video.title} vers le haut`}>↑</button>
                <button className="admin-table-action" disabled={index === videos.length - 1} onClick={() => void moveVideo(index, 1)} aria-label={`Déplacer ${video.title} vers le bas`}>↓</button>
                <button className="admin-table-action" onClick={() => void updateVideo(video, { isActive: !video.isActive }, video.isActive ? "Vidéo désactivée." : "Vidéo activée.")}>{video.isActive ? "Désactiver" : "Activer"}</button>
                <label className="admin-table-action admin-replace-video">Remplacer<input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void replaceVideo(video, file); event.target.value = ""; }} /></label>
                <button className="admin-table-action admin-table-action--danger" onClick={() => void removeVideo(video)}>Supprimer</button>
              </div>
            </article>
          ))}</div>
        )}
      </section>
    </>
  );
}
