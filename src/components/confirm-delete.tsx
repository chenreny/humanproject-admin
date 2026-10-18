"use client";
import { deleteMedia } from "@/app/actions";
export function ConfirmDelete({ id }: { id: string }) {
  return <form action={deleteMedia} onSubmit={(event) => { if (!window.confirm("Delete this published meme? Its caption votes will also be removed.")) event.preventDefault(); }}><input type="hidden" name="id" value={id}/><button className="button danger" type="submit">Delete</button></form>;
}
