interface RemoteCursorProps {
  sid: string;
  x: number;
  y: number;
  color: string;
}

export default function RemoteCursor({ sid, x, y, color }: RemoteCursorProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* Cursor bar */}
      <div
        style={{
          height: '18px',
          width: '2px',
          background: color,
          boxShadow: `0 0 4px ${color}`,
        }}
      />
      {/* User label */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          left: '4px',
          fontSize: '10px',
          background: color,
          color: 'white',
          padding: '2px 4px',
          borderRadius: '3px',
          whiteSpace: 'nowrap',
        }}
      >
        {sid.slice(0, 6)}
      </div>
    </div>
  );
}
