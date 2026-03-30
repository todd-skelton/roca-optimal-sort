import { useRef, useState } from 'react'

interface Props {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export default function FileUpload({ onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    const csvFiles = Array.from(fileList).filter((f) =>
      f.name.toLowerCase().endsWith('.csv'),
    )
    if (csvFiles.length > 0) onFiles(csvFiles)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="text-4xl mb-3">📂</div>
      <p className="text-lg font-semibold text-gray-700">
        Drop Roca CSV files here or click to browse
      </p>
      <p className="text-sm text-gray-500 mt-1">
        Select all sorted stack files — one file per physical stack
      </p>
    </div>
  )
}
