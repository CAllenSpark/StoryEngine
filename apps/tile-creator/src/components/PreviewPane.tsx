export function PreviewPane() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 8,
        gap: 4,
        minHeight: 0,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600 }}>Preview</div>
      <div
        style={{
          flex: 1,
          border: '1px solid #313244',
          borderRadius: 4,
          background: '#11111b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6c7086',
          fontSize: 12,
          textAlign: 'center',
          padding: 16,
        }}
      >
        PixiJS preview coming soon.
        <br />
        Use the canvas editor for WYSIWYG tile editing.
      </div>
    </div>
  );
}
