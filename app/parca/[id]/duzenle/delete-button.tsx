"use client";

import { deleteTrack } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteTrack}
      className="self-center"
      onSubmit={(e) => {
        if (!confirm("Parça kalıcı olarak silinsin mi? Bu geri alınamaz.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-ghost h-auto px-0 text-danger hover:text-danger hover:underline">
        Parçayı sil
      </button>
    </form>
  );
}
