"use client";

import { deleteTrack } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteTrack}
      onSubmit={(e) => {
        if (!confirm("Parça kalıcı olarak silinsin mi? Bu geri alınamaz.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm text-red-300 hover:text-red-200">
        Parçayı sil
      </button>
    </form>
  );
}
