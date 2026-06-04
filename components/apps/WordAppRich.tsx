"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Paragraph,
  Packer,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import mammoth from 'mammoth'
import { saveAs } from 'file-saver'
import { Extension } from '@tiptap/core'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import TableKit from '@tiptap/extension-table'
import TableRowKit from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCellKit from '@tiptap/extension-table-cell'
import TextAlign from '@tiptap/extension-text-align'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: any) => ReturnType
      unsetLineHeight: () => ReturnType
    }
  }
}

const TEMPLATE_MARKUP = {
  blank: '<p></p>',
  resume: `
    <h1>Your Name</h1>
    <p>yourname@email.com | (555) 000-0000 | LinkedIn | GitHub</p>
    <h2>Summary</h2>
    <p>Results-driven professional with experience in...</p>
    <h2>Experience</h2>
    <p><strong>Job Title</strong> — Company Name</p>
    <p>Month Year – Month Year</p>
    <ul>
      <li>Accomplished X by doing Y, resulting in Z</li>
      <li>Led a team of N to deliver...</li>
    </ul>
    <h2>Education</h2>
    <p>Degree Name — University Name</p>
    <p>Year of Graduation</p>
    <h2>Skills</h2>
    <p>Skill 1, Skill 2, Skill 3, Skill 4</p>
  `,
  letter: `
    <p>Your Name<br />Your Address<br />City, State ZIP<br />Date</p>
    <p>Recipient Name<br />Recipient Address<br />City, State ZIP</p>
    <p>Dear [Recipient],</p>
    <p>I am writing to...</p>
    <p>Sincerely,<br />[Your Name]</p>
  `,
  proposal: `
    <h1>Project Proposal</h1>
    <p><strong>Project Name:</strong> </p>
    <p><strong>Date:</strong> </p>
    <p><strong>Prepared by:</strong> </p>
    <h2>Executive Summary</h2>
    <p>Brief overview of the project...</p>
    <h2>Objectives</h2>
    <ol>
      <li>Objective one</li>
      <li>Objective two</li>
    </ol>
    <h2>Scope of Work</h2>
    <p>Detailed description of work to be done...</p>
    <h2>Timeline</h2>
    <p>Phase 1: ...</p>
    <p>Phase 2: ...</p>
    <h2>Budget</h2>
    <p>Estimated total cost: $</p>
  `,
} as const

const FONT_CHOICES = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Courier New',
] as const

const FONT_SIZES = ['10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '24pt', '32pt'] as const
const LINE_HEIGHTS = [
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2' },
] as const

const BLANK_DOCUMENT_HTML = '<p></p>'

const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: element => (element as HTMLElement).style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}` }
        },
      },
    }
  },
})

const LineHeight = Extension.create({
  name: 'lineHeight',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'listItem'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => (element as HTMLElement).style.lineHeight || null,
            renderHTML: attributes => {
              if (!attributes.lineHeight) return {}
              return { style: `line-height: ${attributes.lineHeight}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight: any) =>
        ({ chain }: any) =>
          chain().focus().updateAttributes('paragraph', { lineHeight }).updateAttributes('heading', { lineHeight }).updateAttributes('listItem', { lineHeight }).run(),
      unsetLineHeight:
        () =>
        ({ chain }: any) =>
          chain().focus().updateAttributes('paragraph', { lineHeight: null }).updateAttributes('heading', { lineHeight: null }).updateAttributes('listItem', { lineHeight: null }).run(),
    }
  },
})

type ThemeMode = 'aakash' | 'paatal' | 'dharti' | 'antariksh'

type SavedDocument = {
  id: string
  name: string
  created_at: string
  cloudinary_url: string
  file_size: number
}

type OpenFile = {
  id: string
  name: string
  cloudinary_url: string
  mime_type?: string
}

type ToolbarState = {
  fontFamily: string
  fontSize: string
  textColor: string
  lineHeight: string
  textAlign: 'left' | 'center' | 'right' | 'justify'
}

type DocState = {
  title: string
  content: string
  documentId?: string
}

type WordAppProps = {
  theme?: ThemeMode
  sourceFile?: OpenFile | null
}

function normalizeFontFamily(fontFamily?: string | null) {
  return fontFamily?.replace(/['"]/g, '').split(',')[0]?.trim() || 'Arial'
}

function toDocumentHtml(rawText: string) {
  const lines = rawText.split('\n')
  return lines
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return '<p></p>'
      return `<p>${escapeHtml(trimmed)}</p>`
    })
    .join('')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getAlignmentType(value?: string | null) {
  switch (value) {
    case 'center':
      return AlignmentType.CENTER
    case 'right':
      return AlignmentType.RIGHT
    case 'justify':
      return AlignmentType.JUSTIFIED
    default:
      return AlignmentType.LEFT
  }
}

async function nodeToDocxBlocks(node: ChildNode): Promise<Array<Paragraph | Table>> {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    return text.trim() ? [new Paragraph({ children: [new TextRun(text)] })] : []
  }

  if (!(node instanceof HTMLElement)) {
    return []
  }

  const tag = node.tagName.toLowerCase()
  const lineHeight = node.style.lineHeight || undefined
  const alignment = getAlignmentType(node.style.textAlign || undefined)
  const children = await inlineRunsFromElement(node)

  if (tag === 'br') {
    return [new Paragraph({ children: [new TextRun({ text: '', break: 1 })] })]
  }

  if (tag === 'img') {
    const imageRun = await imageRunFromElement(node as HTMLImageElement)
    return imageRun ? [new Paragraph({ children: [imageRun] })] : []
  }

  if (tag === 'table') {
    return [await tableFromElement(node)]
  }

  if (tag === 'ul' || tag === 'ol') {
    const items = Array.from(node.children).filter(child => child.tagName.toLowerCase() === 'li') as HTMLLIElement[]
    const paragraphs: Paragraph[] = []
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const itemRuns = await inlineRunsFromElement(item)
      paragraphs.push(
        new Paragraph({
          children: tag === 'ul' ? itemRuns : [new TextRun({ text: `${index + 1}. ` }), ...itemRuns],
          bullet: tag === 'ul' ? { level: 0 } : undefined,
          alignment,
          spacing: lineHeight ? { line: lineHeightToDocx(lineHeight), lineRule: 'auto' } : undefined,
        }),
      )
    }
    return paragraphs
  }

  if (tag === 'li') {
    return [new Paragraph({ children, spacing: lineHeight ? { line: lineHeightToDocx(lineHeight), lineRule: 'auto' } : undefined })]
  }

  if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
    const heading = tag === 'h1' ? HeadingLevel.HEADING_1 : tag === 'h2' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3
    return [
      new Paragraph({
        heading,
        children,
        alignment,
        spacing: lineHeight ? { line: lineHeightToDocx(lineHeight), lineRule: 'auto' } : undefined,
      }),
    ]
  }

  if (tag === 'p' || tag === 'div' || tag === 'section') {
    return [
      new Paragraph({
        children: children.length ? children : [new TextRun('')],
        alignment,
        spacing: lineHeight ? { line: lineHeightToDocx(lineHeight), lineRule: 'auto' } : undefined,
      }),
    ]
  }

  if (tag === 'blockquote') {
    return [
      new Paragraph({
        children,
        indent: { left: 720 },
        spacing: lineHeight ? { line: lineHeightToDocx(lineHeight), lineRule: 'auto' } : undefined,
      }),
    ]
  }

  const blocks: Array<Paragraph | Table> = []
  for (const child of Array.from(node.childNodes)) {
    blocks.push(...(await nodeToDocxBlocks(child)))
  }
  return blocks
}

async function inlineRunsFromElement(element: HTMLElement, inherited: InlineStyle = {}): Promise<Array<TextRun | ImageRun>> {
  const nextStyle = { ...inherited }

  const fontFamily = normalizeFontFamily(element.style.fontFamily)
  if (fontFamily) nextStyle.fontFamily = fontFamily

  if (element.style.fontSize) nextStyle.fontSize = element.style.fontSize
  if (element.style.color) nextStyle.color = element.style.color
  if (element.style.fontWeight === 'bold' || Number(element.style.fontWeight) >= 600 || element.tagName.toLowerCase() === 'strong' || element.tagName.toLowerCase() === 'b') nextStyle.bold = true
  if (element.style.fontStyle === 'italic' || element.tagName.toLowerCase() === 'em' || element.tagName.toLowerCase() === 'i') nextStyle.italic = true
  if (element.style.textDecoration.includes('underline') || element.tagName.toLowerCase() === 'u') nextStyle.underline = true
  if (element.style.textDecoration.includes('line-through') || element.tagName.toLowerCase() === 's' || element.tagName.toLowerCase() === 'strike') nextStyle.strike = true

  const runs: Array<TextRun | ImageRun> = []
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      if (!text) continue
      runs.push(new TextRun({
        text,
        bold: nextStyle.bold,
        italics: nextStyle.italic,
        underline: nextStyle.underline ? {} : undefined,
        strike: nextStyle.strike,
        color: nextStyle.color,
        size: nextStyle.fontSize ? fontSizeToDocx(nextStyle.fontSize) : undefined,
        font: nextStyle.fontFamily,
      }))
      continue
    }

    if (!(child instanceof HTMLElement)) continue

    const tag = child.tagName.toLowerCase()

    if (tag === 'br') {
      runs.push(new TextRun({ text: '', break: 1 }))
      continue
    }

    if (tag === 'img') {
      const imageRun = await imageRunFromElement(child as HTMLImageElement)
      if (imageRun) {
        runs.push(imageRun)
      }
      continue
    }

    if (tag === 'a') {
      const linkStyle = { ...nextStyle, underline: true, color: '0563C1' }
      const linkedRuns = await inlineRunsFromElement(child, linkStyle)
      runs.push(...linkedRuns)
      continue
    }

    runs.push(...(await inlineRunsFromElement(child, nextStyle)))
  }

  return runs
}

type InlineStyle = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  color?: string
  fontFamily?: string
  fontSize?: string
}

function fontSizeToDocx(fontSize: string) {
  const numeric = Number.parseFloat(fontSize)
  if (!Number.isFinite(numeric)) return undefined
  if (fontSize.includes('px')) return Math.round(numeric * 2)
  if (fontSize.includes('pt')) return Math.round(numeric * 2)
  return Math.round(numeric * 2)
}

function lineHeightToDocx(lineHeight: string) {
  const numeric = Number.parseFloat(lineHeight)
  if (!Number.isFinite(numeric)) return 240
  return Math.round(numeric * 240)
}

async function imageRunFromElement(element: HTMLImageElement) {
  const src = element.getAttribute('src') || element.src
  if (!src) return null

  try {
    const response = await fetch(src)
    const data = await response.arrayBuffer()
    const width = Number.parseInt(element.getAttribute('width') || '', 10) || 480
    const height = Number.parseInt(element.getAttribute('height') || '', 10) || 270
    return new ImageRun({
      data,
      transformation: { width, height },
    } as any)
  } catch {
    return null
  }
}

async function tableFromElement(element: HTMLElement) {
  const rows = Array.from(element.querySelectorAll(':scope > tbody > tr, :scope > tr'))
  const docxRows = await Promise.all(
    rows.map(async (row) => {
      const cells = Array.from(row.children).filter(cell => cell.tagName.toLowerCase() === 'td' || cell.tagName.toLowerCase() === 'th') as HTMLTableCellElement[]
      const docxCells = await Promise.all(
        cells.map(async (cell) => {
          const blocks: Array<Paragraph | Table> = []
          for (const child of Array.from(cell.childNodes)) {
            blocks.push(...(await nodeToDocxBlocks(child)))
          }
          return new TableCell({
            children: blocks.length ? blocks : [new Paragraph('')],
            width: { size: 100 / Math.max(1, cells.length), type: WidthType.PERCENTAGE },
          })
        }),
      )
      return new TableRow({ children: docxCells })
    }),
  )

  return new Table({
    rows: docxRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function textContentFromHtml(html: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')
  return document.body.textContent || ''
}

async function htmlToDocxChildren(html: string) {
  const parser = new DOMParser()
  const parsed = parser.parseFromString(html, 'text/html')
  const body = parsed.body
  const blocks: Array<Paragraph | Table> = []

  for (const child of Array.from(body.childNodes)) {
    blocks.push(...(await nodeToDocxBlocks(child)))
  }

  return blocks.length ? blocks : [new Paragraph('')]
}

function syncToolbarState(editor: Editor): ToolbarState {
  const textStyle = editor.getAttributes('textStyle') as { fontFamily?: string; fontSize?: string; color?: string }
  const paragraph = editor.getAttributes('paragraph') as { lineHeight?: string; textAlign?: string }
  const heading = editor.getAttributes('heading') as { lineHeight?: string; textAlign?: string }
  const listItem = editor.getAttributes('listItem') as { lineHeight?: string; textAlign?: string }
  const activeAlign = heading.textAlign || paragraph.textAlign || listItem.textAlign || 'left'
  const activeLineHeight = heading.lineHeight || paragraph.lineHeight || listItem.lineHeight || '1.5'

  return {
    fontFamily: normalizeFontFamily(textStyle.fontFamily),
    fontSize: textStyle.fontSize || '12pt',
    textColor: textStyle.color || '#1f2937',
    lineHeight: activeLineHeight,
    textAlign: activeAlign as ToolbarState['textAlign'],
  }
}

function MenuButton({
  children,
  onClick,
  active,
  isDark,
  title,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  isDark: boolean
  title?: string
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center justify-center w-7 h-7 rounded text-[13px] shrink-0 transition-colors ${
        active
          ? isDark
            ? 'bg-blue-900/50 text-blue-300'
            : 'bg-blue-100 text-blue-700'
          : isDark
            ? 'text-slate-300 hover:bg-slate-700'
            : 'text-slate-700 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function Divider({ isDark }: { isDark: boolean }) {
  return <div className={`w-px h-5 mx-1 shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
}

export default function WordApp({ theme: propTheme, sourceFile }: WordAppProps) {
  const [view, setView] = useState<'home' | 'editor'>('home')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingSource, setIsLoadingSource] = useState(false)
  const [showMenu, setShowMenu] = useState<string | null>(null)
  const [recentDocs, setRecentDocs] = useState<SavedDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [wordCount, setWordCount] = useState(0)
  const [theme, setTheme] = useState<ThemeMode>('aakash')
  const [doc, setDoc] = useState<DocState>({
    title: 'Untitled document',
    content: TEMPLATE_MARKUP.blank,
  })
  const [toolbar, setToolbar] = useState<ToolbarState>({
    fontFamily: 'Arial',
    fontSize: '12pt',
    textColor: '#1f2937',
    lineHeight: '1.5',
    textAlign: 'left',
  })

  const imageInputRef = useRef<HTMLInputElement>(null)

  const effectiveTheme = propTheme ?? theme
  const isDark = effectiveTheme === 'paatal' || effectiveTheme === 'antariksh'

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      FontFamily,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({ placeholder: 'Start typing...' }),
      Image.configure({ allowBase64: true }),
      TableKit.configure({ resizable: true }),
      TableRowKit,
      TableHeader,
      TableCellKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LineHeight,
    ],
    content: BLANK_DOCUMENT_HTML,
    editorProps: {
      attributes: {
        spellcheck: 'true',
      },
    },
    onCreate({ editor }) {
      setToolbar(syncToolbarState(editor))
    },
    onSelectionUpdate({ editor }) {
      setToolbar(syncToolbarState(editor))
    },
    onUpdate({ editor }) {
      setWordCount(editor.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0)
      setToolbar(syncToolbarState(editor))
    },
  })

  const loadRecentDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/files')
      const data = await response.json()
      if (data.files) {
        setRecentDocs(data.files.filter((file: { name?: string }) => file.name?.endsWith('.docx')))
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  const applyDocumentContent = useCallback(
    (html: string) => {
      if (!editor) return
      const nextContent = html || BLANK_DOCUMENT_HTML
      if (editor.getHTML() !== nextContent) {
        editor.commands.setContent(nextContent, false)
      }
      setWordCount(editor.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0)
      setToolbar(syncToolbarState(editor))
    },
    [editor],
  )

  const loadDocumentFromSource = useCallback(
    async (file: OpenFile) => {
      setIsLoadingSource(true)
      try {
        const response = await fetch(file.cloudinary_url)
        if (!response.ok) throw new Error('Failed to load document')

        const arrayBuffer = await response.arrayBuffer()
        const extracted = await mammoth.convertToHtml({ arrayBuffer })
        const html = extracted.value || BLANK_DOCUMENT_HTML

        setDoc({
          title: file.name.replace(/\.docx$/i, ''),
          content: html,
          documentId: file.id,
        })
        setView('editor')
      } catch (error) {
        console.error('Failed to load DOCX file:', error)
        alert('Could not open that document in Word.')
      } finally {
        setIsLoadingSource(false)
      }
    },
    [],
  )

  const openTemplate = useCallback(
    (templateId: keyof typeof TEMPLATE_MARKUP, title: string) => {
      setDoc({
        title,
        content: TEMPLATE_MARKUP[templateId],
        documentId: undefined,
      })
      setView('editor')
    },
    [],
  )

  const openDocument = useCallback(
    (savedDoc: SavedDocument) => {
      void loadDocumentFromSource(savedDoc)
    },
    [loadDocumentFromSource],
  )

  useEffect(() => {
    void loadRecentDocuments()

    fetch('/api/me')
      .then(response => response.json())
      .then(data => {
        if (!propTheme && data?.preferences?.theme) setTheme(data.preferences.theme as ThemeMode)
      })
      .catch(() => {})

    const handleWorkspaceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      if (!propTheme && customEvent.detail?.preferences?.theme) {
        setTheme(customEvent.detail.preferences.theme as ThemeMode)
      }
    }

    window.addEventListener('aakash-user-updated', handleWorkspaceUpdate)
    return () => window.removeEventListener('aakash-user-updated', handleWorkspaceUpdate)
  }, [loadRecentDocuments, propTheme])

  useEffect(() => {
    if (!sourceFile) return
    void loadDocumentFromSource(sourceFile)
  }, [sourceFile, loadDocumentFromSource])

  useEffect(() => {
    if (!editor || view !== 'editor') return
    applyDocumentContent(doc.content)
  }, [applyDocumentContent, doc.content, editor, view])

  const insertImage = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const handleImageSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file || !editor) return
      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file.')
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const src = String(reader.result || '')
        editor.chain().focus().setImage({ src, alt: file.name }).run()
      }
      reader.readAsDataURL(file)
    },
    [editor],
  )

  const insertTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()
  }, [editor])

  const openLinkPrompt = useCallback(() => {
    if (!editor) return
    const url = window.prompt('Paste a URL')
    if (!url) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const exportChildren = useCallback(async () => {
    if (!editor) return [new Paragraph('')]
    return await htmlToDocxChildren(editor.getHTML())
  }, [editor])

  const buildDocx = useCallback(async () => {
    const children = await exportChildren()
    return new Document({ sections: [{ properties: {}, children }] })
  }, [exportChildren])

  const handleDownload = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const docx = await buildDocx()
      const blob = await Packer.toBlob(docx)
      const file = new File(
        [blob],
        `${doc.title || 'Document'}.docx`,
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      )
      saveAs(file, file.name)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }, [buildDocx, doc.title, isSaving])

  const handleSaveToDrive = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const docx = await buildDocx()
      const blob = await Packer.toBlob(docx)
      const file = new File(
        [blob],
        `${doc.title || 'Document'}.docx`,
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      )
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/files', { method: 'POST', body: formData })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error || 'Failed to save document')
      }

      const result = await response.json()
      setDoc(current => ({ ...current, documentId: result.file.id }))
      await loadRecentDocuments()
    } catch (error) {
      console.error('Save to drive error:', error)
      alert('Failed to save document to drive')
    } finally {
      setIsSaving(false)
    }
  }, [buildDocx, doc.title, isSaving, loadRecentDocuments])

  const applyToolbarAction = useCallback(
    (action: () => void) => {
      if (!editor) return
      action()
      editor.commands.focus()
    },
    [editor],
  )

  const setFontFamily = useCallback(
    (fontFamily: string) => {
      if (!editor) return
      if (!fontFamily) {
        editor.chain().focus().unsetFontFamily().run()
        return
      }
      editor.chain().focus().setFontFamily(fontFamily).run()
    },
    [editor],
  )

  const setFontSize = useCallback(
    (fontSize: string) => {
      if (!editor) return
      editor.chain().focus().setMark('textStyle', { fontSize }).run()
    },
    [editor],
  )

  const setLineHeight = useCallback(
    (lineHeight: string) => {
      if (!editor) return
      editor.chain().focus().setLineHeight(lineHeight).run()
    },
    [editor],
  )

  const setTextColor = useCallback(
    (color: string) => {
      if (!editor) return
      editor.chain().focus().setColor(color).run()
    },
    [editor],
  )

  const setTextAlign = useCallback(
    (align: ToolbarState['textAlign']) => {
      if (!editor) return
      editor.chain().focus().setTextAlign(align).run()
    },
    [editor],
  )

  const menuItems: Record<string, string[]> = useMemo(
    () => ({
      File: ['New', 'Open', 'Make a copy', '—', 'Save to Drive', 'Download', 'Email', '—', 'Page setup', 'Print'],
      Edit: ['Undo', 'Redo', '—', 'Cut', 'Copy', 'Paste', '—', 'Select all', 'Find and replace'],
      View: ['Mode', 'Show ruler', 'Show outline', '—', 'Full screen'],
      Insert: ['Image', 'Table', 'Link', '—', 'Emoji', 'Date and time', '—', 'Header & footer', 'Page number'],
      Format: ['Text', 'Paragraph styles', 'Align & indent', 'Line & paragraph spacing', '—', 'Columns', 'Bullets & numbering'],
      Tools: ['Spelling and grammar', 'Word count', '—', 'Voice typing', 'Translate document'],
      Help: ['Search menus', '—', 'Docs help', 'Training', 'Updates', '—', 'Report abuse'],
    }),
    [],
  )

  if (view === 'home') {
    return (
      <div className={`flex h-full flex-col transition-colors duration-300 ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-[#f0f4f9] text-slate-800'}`}>
        <header className={`sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-6 transition-colors duration-300 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <path d="M30 4H10C7.8 4 6 5.8 6 8v32c0 2.2 1.8 4 4 4h28c2.2 0 4-1.8 4-4V18L30 4z" fill="#4285F4" />
              <path d="M30 4v14h14L30 4z" fill="#A8C7FA" />
              <path d="M16 26h16v2H16zm0 4h16v2H16zm0 4h10v2H16z" fill="#fff" />
            </svg>
            <span className={`text-[22px] font-normal ${isDark ? 'text-slate-100' : 'text-[#3c4043]'}`}>Word Maker</span>
          </div>

          <div className="flex-1 max-w-[720px] mx-auto">
            <div className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 transition-colors ${isDark ? 'bg-slate-700/50 focus-within:bg-slate-700' : 'bg-[#f0f4f9] focus-within:bg-white focus-within:shadow-md'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#5f6368'} strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input placeholder="Search documents" className={`w-full border-none bg-transparent outline-none text-[15px] ${isDark ? 'text-slate-200 placeholder:text-slate-400' : 'text-[#3c4043] placeholder:text-slate-500'}`} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-green-500 text-sm font-semibold text-white shadow-sm">
              W
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-10 py-8">
          <section className="mx-auto max-w-6xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-[15px] font-medium ${isDark ? 'text-slate-200' : 'text-[#3c4043]'}`}>Start a new document</h2>
              <button className="flex items-center gap-1 text-[13px] font-medium text-blue-500 transition-colors hover:text-blue-600">
                Template gallery
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            </div>

            <div className="flex flex-wrap gap-4">
              {[
                { id: 'blank', label: 'Blank document', sub: undefined, title: 'Untitled document' },
                { id: 'resume', label: 'Resume', sub: 'Classic', title: 'Resume' },
                { id: 'letter', label: 'Letter', sub: 'Spearmint', title: 'Letter' },
                { id: 'proposal', label: 'Project proposal', sub: 'Tropic', title: 'Project Proposal' },
              ].map((template) => (
                <button key={template.id} onClick={() => openTemplate(template.id as keyof typeof TEMPLATE_MARKUP, template.title)} className="group text-left focus:outline-none">
                  <div className={`relative mb-2 flex h-48 w-36 items-center justify-center overflow-hidden rounded-md border transition-all duration-200 ${isDark ? 'border-slate-700 bg-slate-800 group-hover:border-blue-500 group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)]' : 'border-slate-200 bg-white group-hover:border-blue-500 group-hover:shadow-md'}`}>
                    {template.id === 'blank' ? (
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <rect x="4" y="4" width="40" height="40" rx="2" fill={isDark ? '#334155' : '#f8f9fa'} stroke={isDark ? '#475569' : '#dadce0'} />
                        <path d="M18 22h12M18 27h12M18 32h8" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
                        <path d="M28 4v10h10" stroke={isDark ? '#475569' : '#dadce0'} strokeWidth="1.5" />
                      </svg>
                    ) : (
                      <div className={`h-full w-full overflow-hidden p-3 text-[5.5px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-[#3c4043]'}`}>
                        {template.id === 'resume' && (
                          <>
                            <div className="mb-1 text-[9px] font-bold text-blue-500">Your Name</div>
                            <div className="mb-1.5 text-[5px] text-slate-500">email@email.com | (555) 000-0000</div>
                            <div className="mb-1 border-t border-blue-500 pt-1">
                              <div className="mb-0.5 text-[6px] font-bold text-blue-500">EXPERIENCE</div>
                              <div className="text-[5.5px] font-semibold">Job Title — Company</div>
                            </div>
                          </>
                        )}
                        {template.id === 'letter' && (
                          <>
                            <div className="-mx-3 -mt-3 mb-2 h-2 bg-green-500" />
                            <div className="mb-2 text-[6px]">Your Name<br />Your Address</div>
                            <div className="mb-2 text-[6px]">Dear Recipient,</div>
                          </>
                        )}
                        {template.id === 'proposal' && (
                          <>
                            <div className="mb-2 flex gap-1">
                              <div className="h-7 w-5 rounded-sm bg-yellow-400" />
                              <div className="h-7 w-5 rounded-sm bg-green-500" />
                              <div className="h-7 w-5 rounded-sm bg-red-500" />
                            </div>
                            <div className="mb-1 text-[8px] font-bold">Project Name</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`text-[13px] font-medium ${isDark ? 'text-slate-200' : 'text-[#3c4043]'}`}>{template.label}</div>
                  {template.sub && <div className="text-[11px] text-slate-500">{template.sub}</div>}
                </button>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-10 max-w-6xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-[15px] font-medium ${isDark ? 'text-slate-200' : 'text-[#3c4043]'}`}>Recent documents</h2>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {loadingDocs || isLoadingSource ? (
                <div className="col-span-full py-10 text-center text-slate-500">Loading documents...</div>
              ) : recentDocs.length === 0 ? (
                <div className="col-span-full py-10 text-center text-slate-500">No saved documents yet. Save a document to see it here!</div>
              ) : (
                recentDocs.map((item) => (
                  <button key={item.id} onClick={() => openDocument(item)} className="group text-left focus:outline-none">
                    <div className={`overflow-hidden rounded-lg border transition-all duration-200 ${isDark ? 'border-slate-700 bg-slate-800 group-hover:border-slate-500 group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)]' : 'border-slate-200 bg-white group-hover:border-slate-300 group-hover:shadow-md'}`}>
                      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-blue-500 to-green-500 text-4xl">📄</div>
                      <div className="p-3">
                        <div className={`mb-1 truncate text-[13px] font-medium ${isDark ? 'text-slate-200' : 'text-[#3c4043]'}`}>{item.name.replace('.docx', '')}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                          {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className={`flex h-full flex-col transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-[#f0f4f9]'}`} onClick={() => setShowMenu(null)}>
      <header className={`flex h-14 items-center gap-3 border-b px-4 shrink-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <button onClick={() => setView('home')} className={`flex rounded p-1.5 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Go to Docs home">
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
            <path d="M30 4H10C7.8 4 6 5.8 6 8v32c0 2.2 1.8 4 4 4h28c2.2 0 4-1.8 4-4V18L30 4z" fill="#4285F4" />
            <path d="M30 4v14h14L30 4z" fill="#A8C7FA" />
          </svg>
        </button>

        <div className="flex-1">
          <input
            value={doc.title}
            onChange={event => setDoc(current => ({ ...current, title: event.target.value }))}
            className={`w-full max-w-[360px] border-b-2 border-transparent bg-transparent text-[18px] outline-none transition-colors focus:border-blue-500 ${isDark ? 'text-slate-200' : 'text-[#3c4043]'}`}
          />
          <div className="mt-0.5 flex gap-0">
            {Object.keys(menuItems).map(menu => (
              <div key={menu} className="relative">
                <button
                  onClick={event => {
                    event.stopPropagation()
                    setShowMenu(showMenu === menu ? null : menu)
                  }}
                  className={`rounded px-2 py-0.5 text-[13px] transition-colors ${showMenu === menu ? (isDark ? 'bg-slate-700 text-slate-100' : 'bg-blue-50 text-blue-700') : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-[#3c4043] hover:bg-slate-100'}`}
                >
                  {menu}
                </button>
                {showMenu === menu && (
                  <div onClick={event => event.stopPropagation()} className={`absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border py-1 shadow-lg ${isDark ? 'border-slate-700 bg-slate-800 shadow-black/50' : 'border-slate-200 bg-white'}`}>
                    {menuItems[menu].map((item, index) => item === '—' ? (
                      <div key={index} className={`my-1 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    ) : (
                      <button
                        key={index}
                        onClick={() => {
                          setShowMenu(null)
                          if (item === 'Download') void handleDownload()
                          if (item === 'Save to Drive') void handleSaveToDrive()
                          if (item === 'Image') insertImage()
                          if (item === 'Table') insertTable()
                          if (item === 'Link') openLinkPrompt()
                        }}
                        className={`block w-full px-4 py-1.5 text-left text-[13px] transition-colors ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-[#3c4043] hover:bg-slate-100'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSaveToDrive}
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all ${isSaving ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-px hover:shadow-md'}`}
          >
            {isSaving ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            )}
            {doc.documentId ? 'Update Drive' : 'Save to Drive'}
          </button>
          <button
            onClick={handleDownload}
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all ${isSaving ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-px hover:shadow-md'}`}
          >
            {isSaving ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            )}
            Download
          </button>
        </div>
      </header>

      <div className={`flex flex-wrap items-center gap-1 overflow-x-auto border-b px-4 py-1.5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-[#f8f9fa]'}`}>
        <MenuButton isDark={isDark} title="Undo" onClick={() => applyToolbarAction(() => editor?.chain().undo().run())}>
          ↶
        </MenuButton>
        <MenuButton isDark={isDark} title="Redo" onClick={() => applyToolbarAction(() => editor?.chain().redo().run())}>
          ↷
        </MenuButton>
        <Divider isDark={isDark} />
        <select value={toolbar.fontFamily} onChange={event => setFontFamily(event.target.value)} className={`cursor-pointer rounded border px-2 py-1 text-[13px] outline-none ${isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-white text-[#3c4043]'}`}>
          {FONT_CHOICES.map(font => <option key={font} value={font}>{font}</option>)}
        </select>
        <select value={toolbar.fontSize} onChange={event => setFontSize(event.target.value)} className={`cursor-pointer rounded border px-2 py-1 text-[13px] outline-none ${isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-white text-[#3c4043]'}`}>
          {FONT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
        </select>
        <input type="color" value={toolbar.textColor} onChange={event => setTextColor(event.target.value)} className={`h-8 w-10 cursor-pointer rounded border p-0 ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-200 bg-white'}`} />
        <select value={toolbar.lineHeight} onChange={event => setLineHeight(event.target.value)} className={`cursor-pointer rounded border px-2 py-1 text-[13px] outline-none ${isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-white text-[#3c4043]'}`}>
          {LINE_HEIGHTS.map(item => <option key={item.value} value={item.value}>Line {item.label}</option>)}
        </select>
        <Divider isDark={isDark} />
        <MenuButton isDark={isDark} active={editor?.isActive('bold')} title="Bold" onClick={() => applyToolbarAction(() => editor?.chain().toggleBold().run())}>
          <strong>B</strong>
        </MenuButton>
        <MenuButton isDark={isDark} active={editor?.isActive('italic')} title="Italic" onClick={() => applyToolbarAction(() => editor?.chain().toggleItalic().run())}>
          <em>I</em>
        </MenuButton>
        <MenuButton isDark={isDark} active={editor?.isActive('underline')} title="Underline" onClick={() => applyToolbarAction(() => editor?.chain().toggleUnderline().run())}>
          <span className="underline">U</span>
        </MenuButton>
        <MenuButton isDark={isDark} title="Strike through" onClick={() => applyToolbarAction(() => editor?.chain().toggleStrike().run())}>
          <span className="line-through">S</span>
        </MenuButton>
        <MenuButton isDark={isDark} title="Clear formatting" onClick={() => applyToolbarAction(() => editor?.chain().unsetAllMarks().clearNodes().run())}>
          ✕
        </MenuButton>
        <Divider isDark={isDark} />
        <MenuButton isDark={isDark} active={toolbar.textAlign === 'left'} title="Align left" onClick={() => setTextAlign('left')}>
          ⬅
        </MenuButton>
        <MenuButton isDark={isDark} active={toolbar.textAlign === 'center'} title="Align center" onClick={() => setTextAlign('center')}>
          ≡
        </MenuButton>
        <MenuButton isDark={isDark} active={toolbar.textAlign === 'right'} title="Align right" onClick={() => setTextAlign('right')}>
          ➡
        </MenuButton>
        <MenuButton isDark={isDark} active={toolbar.textAlign === 'justify'} title="Justify" onClick={() => setTextAlign('justify')}>
          ☰
        </MenuButton>
        <Divider isDark={isDark} />
        <MenuButton isDark={isDark} title="Bullet list" onClick={() => applyToolbarAction(() => editor?.chain().toggleBulletList().run())}>
          •
        </MenuButton>
        <MenuButton isDark={isDark} title="Numbered list" onClick={() => applyToolbarAction(() => editor?.chain().toggleOrderedList().run())}>
          1.
        </MenuButton>
        <MenuButton isDark={isDark} title="Insert image" onClick={insertImage}>
          🖼
        </MenuButton>
        <MenuButton isDark={isDark} title="Insert table" onClick={insertTable}>
          ▦
        </MenuButton>
        <MenuButton isDark={isDark} title="Insert link" onClick={openLinkPrompt}>
          🔗
        </MenuButton>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
      </div>

      <main className={`flex-1 overflow-y-auto py-8 ${isDark ? 'bg-slate-900' : 'bg-[#f0f4f9]'}`}>
        <div className="flex justify-center">
          <div className="w-[816px] max-w-[calc(100vw-2rem)]">
            <div className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm shadow-sm ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`}>
              <div className="flex items-center gap-3">
                <span>Font family: {toolbar.fontFamily}</span>
                <span>Size: {toolbar.fontSize}</span>
                <span>Line spacing: {toolbar.lineHeight}</span>
              </div>
              <span>{wordCount} words</span>
            </div>

            <div className={`overflow-hidden rounded-2xl border shadow-[0_24px_60px_rgba(15,23,42,0.12)] ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
              <EditorContent
                editor={editor}
                className={`word-editor min-h-[1056px] px-24 py-24 outline-none ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
                style={{
                  fontSize: toolbar.fontSize,
                  fontFamily: toolbar.fontFamily,
                  color: toolbar.textColor,
                  lineHeight: toolbar.lineHeight,
                }}
              />
            </div>
          </div>
        </div>
      </main>

      <div className={`flex h-8 items-center justify-between border-t px-4 text-xs shrink-0 ${isDark ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}>
        <span>English (US)</span>
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span className="cursor-pointer text-blue-500">Editing</span>
        </div>
      </div>
    </div>
  )
}
