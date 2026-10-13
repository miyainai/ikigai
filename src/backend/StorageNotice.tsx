export function StorageNotice({ storageFailed, retrySave }: { storageFailed: boolean; retrySave: () => void }) {
  return <div className="cloud-save-status">
    <span role="status">{storageFailed ? "Not saved to this browser. Keep this tab open or download your PDF." : "Saved on this device"}</span>
    {storageFailed ? <button type="button" onClick={retrySave}>Retry saving</button> : null}
  </div>;
}
