"use client";

import { useState } from "react";
import { createMedia } from "@/app/actions";
import { MEDIA_TEMPLATES } from "@/lib/media-templates";

type Source = "template" | "upload" | "generated";

export function MediaSourceForm() {
  const [source, setSource] = useState<Source>("template");
  const [templateId, setTemplateId] = useState("disaster-girl");
  const [preview, setPreview] = useState("");
  const selected = MEDIA_TEMPLATES.find((template) => template.id === templateId);

  return <form action={createMedia} className="form-card media-form">
    <p className="form-note">Choose a template, upload a picture, or generate an image. We’ll write a caption and publish it to the existing community feed.</p>
    <div className="field">
      <span className="field-label">Start with a picture</span>
      <div className="source-tabs" role="group" aria-label="Picture source">
        {([ ["template", "Templates"], ["upload", "Upload image"], ["generated", "Generate with AI"] ] as const).map(([value, label]) => <button key={value} type="button" className={`button ${source === value ? "primary" : ""}`} aria-pressed={source === value} onClick={() => { setSource(value); setPreview(""); }}>{label}</button>)}
      </div>
      <input type="hidden" name="image_source" value={source} />
      {source === "template" && <>
        <input type="hidden" name="template_id" value={templateId} />
        <div className="template-grid">{MEDIA_TEMPLATES.map((template) => <button key={template.id} type="button" className={`template-card ${templateId === template.id ? "selected" : ""}`} aria-pressed={templateId === template.id} onClick={() => setTemplateId(template.id)}>
          {/* Local files come from the server-owned allowlist. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/${template.file}`} alt="" />
          <span>{template.name}</span><small>{template.category}</small>
        </button>)}</div>
        {selected && <p className="field-hint">Selected: {selected.name}</p>}
      </>}
      {source === "upload" && <div className="upload-source">
        <label htmlFor="media-image">Choose an image</label>
        <input id="media-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPreview(event.target.files?.[0]?.name ?? "")} />
        <small>JPEG, PNG, or WebP · maximum 3 MB · minimum 64 × 64 pixels. The image is normalized to JPEG before publishing.</small>
        {preview && <span className="field-hint">Selected: {preview}</span>}
      </div>}
      {source === "generated" && <p className="source-note">AI will create a picture from your scene description below. You can also choose a topic to guide the caption.</p>}
    </div>
    <div className="field"><label htmlFor="prompt">Describe the scene</label><textarea id="prompt" name="prompt" minLength={10} maxLength={500} required placeholder="A Columbia student trying to carry three coffees and a stack of library books through the subway…"/><small>10–500 characters. Avoid names or sensitive personal details.</small></div>
    <div className="field"><label htmlFor="topic">Topic</label><select id="topic" name="topic" defaultValue="Campus">{["Campus", "Ktown", "EastVillage", "NYC", "Dorm life"].map((topic) => <option key={topic} value={topic}>{topic === "EastVillage" ? "East Village" : topic}</option>)}</select></div>
    <button className="button primary" type="submit">✦ Generate caption and publish</button>
  </form>;
}
