"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Merge,
  Underline,
  Table,
  Code,
  Save,
  Eye,
  EyeOff,
  QrCode,
  Trash2,
  Undo2,
  Redo,
  Grid2X2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Square,
  PanelRight,
  Columns,
} from "lucide-react";

// ---------------------------------------------------------------------------
// QR code placeholder SVG (shown in the editor for visual feedback)
// ---------------------------------------------------------------------------
const QR_PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">` +
      `<rect width="80" height="80" fill="#ffffff" stroke="#94a3b8" stroke-dasharray="4 4"/>` +
      `<g fill="#0f172a">` +
      `<rect x="8" y="8" width="20" height="20"/>` +
      `<rect x="12" y="12" width="12" height="12" fill="#ffffff"/>` +
      `<rect x="14" y="14" width="8" height="8"/>` +
      `<rect x="52" y="8" width="20" height="20"/>` +
      `<rect x="56" y="12" width="12" height="12" fill="#ffffff"/>` +
      `<rect x="58" y="14" width="8" height="8"/>` +
      `<rect x="8" y="52" width="20" height="20"/>` +
      `<rect x="12" y="56" width="12" height="12" fill="#ffffff"/>` +
      `<rect x="14" y="58" width="8" height="8"/>` +
      `<rect x="34" y="8" width="4" height="4"/>` +
      `<rect x="42" y="8" width="4" height="4"/>` +
      `<rect x="34" y="16" width="4" height="4"/>` +
      `<rect x="40" y="20" width="4" height="4"/>` +
      `<rect x="34" y="28" width="4" height="4"/>` +
      `<rect x="44" y="28" width="4" height="4"/>` +
      `<rect x="8" y="34" width="4" height="4"/>` +
      `<rect x="16" y="34" width="4" height="4"/>` +
      `<rect x="24" y="34" width="4" height="4"/>` +
      `<rect x="34" y="34" width="4" height="4"/>` +
      `<rect x="44" y="34" width="4" height="4"/>` +
      `<rect x="52" y="34" width="4" height="4"/>` +
      `<rect x="60" y="34" width="4" height="4"/>` +
      `<rect x="68" y="34" width="4" height="4"/>` +
      `<rect x="12" y="42" width="4" height="4"/>` +
      `<rect x="20" y="42" width="4" height="4"/>` +
      `<rect x="32" y="42" width="4" height="4"/>` +
      `<rect x="40" y="42" width="4" height="4"/>` +
      `<rect x="48" y="42" width="4" height="4"/>` +
      `<rect x="60" y="42" width="4" height="4"/>` +
      `<rect x="8" y="50" width="4" height="4"/>` +
      `<rect x="20" y="50" width="4" height="4"/>` +
      `<rect x="34" y="50" width="4" height="4"/>` +
      `<rect x="44" y="50" width="4" height="4"/>` +
      `<rect x="52" y="50" width="4" height="4"/>` +
      `<rect x="64" y="50" width="4" height="4"/>` +
      `<rect x="14" y="60" width="4" height="4"/>` +
      `<rect x="24" y="60" width="4" height="4"/>` +
      `<rect x="34" y="60" width="4" height="4"/>` +
      `<rect x="42" y="60" width="4" height="4"/>` +
      `<rect x="52" y="60" width="4" height="4"/>` +
      `<rect x="60" y="60" width="4" height="4"/>` +
      `<rect x="68" y="60" width="4" height="4"/>` +
      `<rect x="34" y="68" width="4" height="4"/>` +
      `<rect x="44" y="68" width="4" height="4"/>` +
      `<rect x="56" y="68" width="4" height="4"/>` +
      `<rect x="64" y="68" width="4" height="4"/>` +
      `</g>` +
      `<text x="40" y="46" font-family="sans-serif" font-size="7" text-anchor="middle" fill="#64748b">QR</text>` +
      `</svg>`
  );

// ---------------------------------------------------------------------------
// Available placeholders that can be inserted into the label template
// ---------------------------------------------------------------------------
const PLACEHOLDERS = [
  { token: "{{name}}", label: "Nom" },
  { token: "{{atelier}}", label: "Atelier" },
  { token: "{{dimensions}}", label: "Dimensions" },
  { token: "{{surface}}", label: "Surface" },
  { token: "{{nature}}", label: "Nature" },
  { token: "{{color}}", label: "Couleur" },
  { token: "{{thickness}}", label: "Épaisseur" },
  { token: "{{plies}}", label: "Plis" },
  { token: "{{motif}}", label: "Motif" },
  { token: "{{commande}}", label: "Commande" },
  { token: "{{date}}", label: "Date" },
  { token: "{{observation}}", label: "Observation" },
  { token: "{{cmd-date}}", label: "Date commande" },
  { token: "{{client}}", label: "Client" },
  { token: "{{designation}}", label: "Désignation" },
  { token: "{{quantite}}", label: "Quantité" },
];

const FONTS = [
  "Arial",
  "Arial Black",
  "Courier New",
  "Georgia",
  "Impact",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LabelDesignAdmin() {
  const editorRef = useRef<HTMLDivElement>(null);
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [variableId, setVariableId] = useState<number | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const htmlContentRef = useRef(""); // always tracks the latest htmlContent synchronously
  const [tableWidth, setTableWidth] = useState("100%");
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const MAX_UNDO = 50;

  // Tab state for Label Card / Delivery Card
  type TabKey = "labelCard" | "deliveryCard";
  const [activeTab, setActiveTab] = useState<TabKey>("labelCard");
  const templatesRef = useRef<{
    labelCard: { html: string; variableId: number | null; loaded: boolean };
    deliveryCard: { html: string; variableId: number | null; loaded: boolean };
  }>({
    labelCard: { html: "", variableId: null, loaded: false },
    deliveryCard: { html: "", variableId: null, loaded: false },
  });

  // Border picker state
  const [borderPickerOpen, setBorderPickerOpen] = useState(false);
  const [borderColor, setBorderColor] = useState("#333333");
  const [borderStyle, setBorderStyle] = useState("solid");
  const [borderWidth, setBorderWidth] = useState("1");
  const borderPickerRef = useRef<HTMLDivElement>(null);

  // Close border picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        borderPickerRef.current &&
        !borderPickerRef.current.contains(e.target as Node)
      ) {
        setBorderPickerOpen(false);
      }
    }
    if (borderPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [borderPickerOpen]);

  // Load templates for both tabs
  useEffect(() => {
    async function loadAllTemplates() {
      try {
        // Fetch both variables in one request (use OR-like search with two calls)
        const [labelRes, deliveryRes] = await Promise.all([
          fetch("/api/admin/variables?search=LABEL_TEMPLATE"),
          fetch("/api/admin/variables?search=DELIVERY_TEMPLATE"),
        ]);

        const results = await Promise.all([labelRes.json(), deliveryRes.json()]);

        const processResult = (tabKey: TabKey, data: any, defaultFn: () => string) => {
          if (data.success && data.data.items.length > 0) {
            const v = data.data.items[0];
            templatesRef.current[tabKey] = {
              html: v.value || "",
              variableId: v.id,
              loaded: true,
            };
          } else {
            templatesRef.current[tabKey] = {
              html: defaultFn(),
              variableId: null,
              loaded: true,
            };
          }
        };

        processResult("labelCard", results[0], getDefaultTemplate);
        processResult("deliveryCard", results[1], getDeliveryDefaultTemplate);
      } catch {
        templatesRef.current.labelCard = {
          html: getDefaultTemplate(),
          variableId: null,
          loaded: true,
        };
        templatesRef.current.deliveryCard = {
          html: getDeliveryDefaultTemplate(),
          variableId: null,
          loaded: true,
        };
      } finally {
        // Set the content for the active tab
        const active = templatesRef.current[activeTab];
        setHtmlContent(active.html);
        htmlContentRef.current = active.html;
        setVariableId(active.variableId);
        if (editorRef.current) {
          editorRef.current.innerHTML = active.html;
        }
        setLoading(false);
      }
    }
    loadAllTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach column resizers whenever the editor content changes (debounced via rAF)
  const refreshResizers = useCallback(() => {
    if (editorRef.current && !showSource) {
      attachColumnResizers(editorRef.current);
      attachQrResizeHandles(editorRef.current);
    }
  }, [showSource]);

  // Handle keyboard shortcuts in the editor
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Undo: Ctrl+Z
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }

    // Tab key in tables: add new row when in last cell of any row
    if (e.key !== "Tab") return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const node = sel.anchorNode;
    if (!(node instanceof Node)) return;

    const cell = node.parentElement?.closest("td, th");
    if (!cell) return;

    const row = cell.parentElement;
    if (!row || row.tagName !== "TR") return;

    const table = row.closest("table");
    if (!table) return;

    const cells = Array.from(row.children);
    const currentCellIndex = cells.indexOf(cell as HTMLElement);
    const isLastCell = currentCellIndex === cells.length - 1;

    if (isLastCell) {
      e.preventDefault();

      // Create a new row with cells matching the number of columns
      const numCols = cells.length;
      const newCells = Array.from({ length: numCols })
        .map(
          () =>
            `<td style="padding: 4px;">&nbsp;</td>`
        )
        .join("");
      const newRow = document.createElement("tr");
      newRow.innerHTML = newCells;
      table.querySelector("tbody")?.appendChild(newRow) || table.appendChild(newRow);

      // Move cursor to first cell of new row
      const firstNewCell = newRow.children[0] as HTMLElement;
      const range = document.createRange();
      range.selectNodeContents(firstNewCell);
      const newSel = window.getSelection();
      newSel?.removeAllRanges();
      newSel?.addRange(range);

      updateContentFromEditor();

      // Re-attach resizers to the updated table
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    }
  }

  // When the editor becomes visible (initial load or switching from source),
  // populate it with the current htmlContent. This runs AFTER React has rendered
  // the contentEditable div, so editorRef.current is guaranteed to exist.
  useEffect(() => {
    if (!loading && !showSource && editorRef.current) {
      editorRef.current.innerHTML = htmlContent || "";
      refreshResizers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, showSource]);

  // Sync contentEditable → state when showing source
  const updateContentFromEditor = useCallback((): string | undefined => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setHtmlContent(html);
      if (codeTextareaRef.current) {
        codeTextareaRef.current.value = html;
      }
      return html;
    }
    return undefined;
  }, []);

  // Sync textarea → state when editing source
  const updateContentFromTextarea = useCallback(() => {
    if (codeTextareaRef.current) {
      const html = codeTextareaRef.current.value;
      setHtmlContent(html);
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }
    }
  }, []);

  // Execute a document.execCommand on the editor
  function execCmd(command: string, value?: string) {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      updateContentFromEditor();
    }
  }

  // Apply font size (px) by wrapping the selection in a span with style
  function handleFontSize(size: string) {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    // Extract selected content, wrap in a span, and re-insert
    const fragment = range.extractContents();
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.appendChild(fragment);
    range.insertNode(span);

    // Collapse selection to end of inserted span
    range.setStartAfter(span);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    updateContentFromEditor();
  }

  // Insert HTML at cursor position (for placeholders, tables, etc.)
  function insertHtml(html: string) {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand("insertHTML", false, html);
      updateContentFromEditor();
    }
  }

  // Insert a placeholder
  function insertPlaceholder(token: string) {
    insertHtml(
      `<span style="background: #e0f2fe; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: inherit;">${token}</span>`
    );
  }

  // Insert a table
  function insertTable() {
    insertHtml(
      `<table style="width: ${tableWidth}; border-collapse: collapse;">` +
        '<colgroup><col style="width: 50%"><col style="width: 50%"></colgroup>' +
        '<thead><tr>' +
        '<th style="padding: 4px; background: #f1f5f9;">Header 1</th>' +
        '<th style="padding: 4px; background: #f1f5f9;">Header 2</th>' +
        "</tr></thead><tbody><tr>" +
        '<td style="padding: 4px;">Data 1</td>' +
        '<td style="padding: 4px;">Data 2</td>' +
        "</tr></tbody></table>"
    );
    // Attach resize handles to the newly inserted table
    setTimeout(() => {
      if (editorRef.current) attachColumnResizers(editorRef.current);
    }, 0);
  }

  // Change width of the currently selected table
  function changeTableWidth(width: string) {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) {
        setMessage({ type: "error", text: "Cliquez dans un tableau pour changer sa largeur." });
        return;
      }
      const { table } = ctx;
      (table as HTMLElement).style.width = width;
      updateContentFromEditor();
    });
  }

  // Align the entire table (left, center, right)
  function alignTable(align: "left" | "center" | "right") {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) {
        setMessage({ type: "error", text: "Cliquez dans un tableau pour l'aligner." });
        return;
      }
      const { table } = ctx;
      const tableEl = table as HTMLElement;
      
      // Remove existing alignment styles on the table itself
      tableEl.style.marginLeft = "";
      tableEl.style.marginRight = "";
      tableEl.style.float = "";
      tableEl.style.display = "";
      tableEl.style.textAlign = "";
      
      // Check if the table is already wrapped in a centering wrapper we created
      const parent = tableEl.parentElement;
      const isWrapped = parent && 
        parent.tagName === "DIV" && 
        parent.style.display === "flex" && 
        parent.style.justifyContent === "center" &&
        parent.getAttribute("data-align-wrapper") === "true";
      
      // If currently centered and clicking center again, or clicking left/right, unwrap first
      if (isWrapped) {
        const grandParent = parent.parentElement;
        // Move the table before the wrapper, then remove the wrapper
        parent.replaceWith(tableEl);
      }
      
      if (align === "left") {
        tableEl.style.marginLeft = "0";
        tableEl.style.marginRight = "0";
      } else if (align === "center") {
        // Wrap the table in a flex container for reliable centering
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "center";
        wrapper.style.width = "100%";
        wrapper.setAttribute("data-align-wrapper", "true");
        tableEl.parentNode?.insertBefore(wrapper, tableEl);
        wrapper.appendChild(tableEl);
      } else if (align === "right") {
        // Wrap the table in a flex container for right alignment
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "flex-end";
        wrapper.style.width = "100%";
        wrapper.setAttribute("data-align-wrapper", "true");
        tableEl.parentNode?.insertBefore(wrapper, tableEl);
        wrapper.appendChild(tableEl);
      }
      
      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    });
  }

  // Apply vertical alignment to the current table cell
  function alignCellVertical(align: "top" | "middle" | "bottom") {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) {
        setMessage({ type: "error", text: "Cliquez dans une cellule pour l'aligner verticalement." });
        return;
      }
      const { cell } = ctx;
      cell.style.verticalAlign = align;
      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    });
  }

  // Insert a QR code placeholder bound to a token (e.g. {{name}})
  function insertQrCode() {
    insertHtml(
      `<img data-qr="{{name}}" data-resizable="qr" contenteditable="false" ` +
        `src="${QR_PLACEHOLDER_SVG}" ` +
        `alt="QR {{name}}" ` +
        `style="width: 80px; height: 80px; display: inline-block; vertical-align: middle;" />`
    );
    // Attach resize handles to the newly inserted QR code
    setTimeout(() => {
      if (editorRef.current) attachQrResizeHandles(editorRef.current);
    }, 0);
  }

  // Attach resize handles to QR code images
  function attachQrResizeHandles(root: HTMLElement) {
    const qrImages = root.querySelectorAll('img[data-resizable="qr"]');
    qrImages.forEach((img) => {
      const el = img as HTMLElement;
      if (el.dataset.resized === "true") return;
      el.dataset.resized = "true";

      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.display = "inline-block";
      wrapper.style.verticalAlign = "middle";

      // Move the image into the wrapper
      el.parentNode?.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      // Bottom-right resize handle
      const handle = document.createElement("div");
      handle.setAttribute("contenteditable", "false");
      handle.style.position = "absolute";
      handle.style.bottom = "-4px";
      handle.style.right = "-4px";
      handle.style.width = "12px";
      handle.style.height = "12px";
      handle.style.cursor = "nwse-resize";
      handle.style.userSelect = "none";
      handle.style.zIndex = "10";
      handle.style.backgroundColor = "#3b82f6";
      handle.style.border = "1px solid #fff";
      handle.style.borderRadius = "2px";
      wrapper.appendChild(handle);

      handle.addEventListener("mousedown", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = el.offsetWidth;
        const startHeight = el.offsetHeight;

        const onMove = (ev: MouseEvent) => {
          const deltaX = ev.clientX - startX;
          const deltaY = ev.clientY - startY;
          const newSize = Math.max(30, Math.max(startWidth + deltaX, startHeight + deltaY));
          el.style.width = `${newSize}px`;
          el.style.height = `${newSize}px`;
        };

        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          updateContentFromEditor();
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    });
  }

  // Helper: get current selection's cell, row, and table
  function getSelectionContext() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const node = sel.anchorNode;
    if (!(node instanceof Node)) return null;
    const cell = node.parentElement?.closest("td, th");
    if (!cell) return null;
    const row = cell.parentElement;
    if (!row || row.tagName !== "TR") return null;
    const table = row.closest("table");
    if (!table) return null;
    return { cell: cell as HTMLElement, row, table };
  }

  // Add a row after the current row
  function addRowAfter() {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) return;
      const { row, table } = ctx;
      const cells = Array.from(row.children);
      const numCols = cells.length;
      const cellTag = row.children[0]?.tagName === "TH" ? "th" : "td";
      const newCells = Array.from({ length: numCols })
        .map(() => `<${cellTag} style="padding: 4px;">&nbsp;</${cellTag}>`)
        .join("");
      const newRow = document.createElement("tr");
      newRow.innerHTML = newCells;
      row.after(newRow);
      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    });
  }

  // Add a row before the current row
  function addRowBefore() {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) return;
      const { row, table } = ctx;
      const cells = Array.from(row.children);
      const numCols = cells.length;
      const cellTag = row.children[0]?.tagName === "TH" ? "th" : "td";
      const newCells = Array.from({ length: numCols })
        .map(() => `<${cellTag} style="padding: 4px;">&nbsp;</${cellTag}>`)
        .join("");
      const newRow = document.createElement("tr");
      newRow.innerHTML = newCells;
      row.before(newRow);
      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    });
  }

  // Delete the current row
  function deleteRow() {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) return;
      const { row, table } = ctx;
      const rows = table.querySelectorAll("tr");
      if (rows.length <= 1) {
        setMessage({ type: "error", text: "Impossible de supprimer la dernière ligne." });
        return;
      }
      row.remove();
      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    });
  }

  // Add a column after the current cell
  function addColumnAfter() {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) return;
      const { cell, row, table } = ctx;
      const cells = Array.from(row.children);
      const cellIndex = cells.indexOf(cell);
      const cellTag = cell.tagName;
      const newCell = document.createElement(cellTag);
      newCell.style.cssText = "padding: 4px;";
      newCell.innerHTML = "&nbsp;";
      cell.after(newCell);

      // Add cells to all other rows
      const rows = table.querySelectorAll("tr");
      rows.forEach((r) => {
        if (r === row) return;
        const rCells = Array.from(r.children);
        const insertIndex = Math.min(cellIndex + 1, rCells.length);
        const newRCell = document.createElement(cellTag);
        newRCell.style.cssText = "padding: 4px;";
        newRCell.innerHTML = "&nbsp;";
        if (rCells[insertIndex]) {
          rCells[insertIndex].before(newRCell);
        } else {
          r.appendChild(newRCell);
        }
      });

      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    });
  }

  // Add a column before the current cell
  function addColumnBefore() {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) return;
      const { cell, row, table } = ctx;
      const cells = Array.from(row.children);
      const cellIndex = cells.indexOf(cell);
      const cellTag = cell.tagName;
      const newCell = document.createElement(cellTag);
      newCell.style.cssText = "padding: 4px;";
      newCell.innerHTML = "&nbsp;";
      cell.before(newCell);

      // Add cells to all other rows
      const rows = table.querySelectorAll("tr");
      rows.forEach((r) => {
        if (r === row) return;
        const rCells = Array.from(r.children);
        const insertIndex = Math.min(cellIndex, rCells.length);
        const newRCell = document.createElement(cellTag);
        newRCell.style.cssText = "padding: 4px;";
        newRCell.innerHTML = "&nbsp;";
        if (rCells[insertIndex]) {
          rCells[insertIndex].before(newRCell);
        } else {
          r.appendChild(newRCell);
        }
      });

      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    });
  }

  // Delete the current column
  function deleteColumn() {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) return;
      const { cell, table } = ctx;
      const row = cell.parentElement;
      if (!row || row.tagName !== "TR") return;

      const cells = Array.from(row.children);
      const cellIndex = cells.indexOf(cell);
      const rows = table.querySelectorAll("tr");
      const isLastColumn = cellIndex === cells.length - 1;

      // Check if table has only one column
      const firstRowCells = Array.from((table.querySelector("tr") as HTMLElement).children);
      if (firstRowCells.length <= 1) {
        setMessage({ type: "error", text: "Impossible de supprimer la dernière colonne." });
        return;
      }

      // Remove the column cells from all rows
      rows.forEach((r) => {
        const rCells = Array.from(r.children);
        if (rCells[cellIndex]) {
          rCells[cellIndex].remove();
        }
      });

      // Remove the corresponding <col> element from colgroup
      const cols = table.querySelectorAll("colgroup col");
      if (cols[cellIndex]) {
        (cols[cellIndex] as HTMLElement).remove();
      }

      // If the deleted column was the last one, expand the remaining columns to fill the table
      if (isLastColumn) {
        const remainingCols = table.querySelectorAll("colgroup col");
        if (remainingCols.length > 0) {
          const lastCol = remainingCols[remainingCols.length - 1] as HTMLElement;
          lastCol.style.width = "100%";
        }
      }

      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    });
  }

  // Delete the entire table containing the current selection
  function deleteTable() {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) {
        setMessage({ type: "error", text: "Cliquez dans un tableau pour le supprimer." });
        return;
      }
      const { table } = ctx;
      const tableEl = table as HTMLElement;
      const parent = tableEl.parentElement;
      // If the table is wrapped in an alignment wrapper, remove the wrapper too
      if (parent && parent.getAttribute("data-align-wrapper") === "true") {
        parent.remove();
      } else {
        tableEl.remove();
      }
      updateContentFromEditor();
    });
  }

  // Merge current cell with the cell on the left
  function mergeCellLeft() {
    withUndo(() => {
      const ctx = getSelectionContext();
      if (!ctx) return;
      const { cell, row, table } = ctx;
      const cells = Array.from(row.children);
      const cellIndex = cells.indexOf(cell);

      // Cannot merge the first cell
      if (cellIndex <= 0) {
        setMessage({ type: "error", text: "Impossible de fusionner : la cellule est déjà la première de la ligne." });
        return;
      }

      const leftCell = cells[cellIndex - 1] as HTMLElement;

      // Get current colspan values
      const currentColspan = parseInt(cell.getAttribute("colspan") || "1");
      const leftColspan = parseInt(leftCell.getAttribute("colspan") || "1");

      // Move content from current cell to left cell
      const leftContent = leftCell.innerHTML.trim();
      const rightContent = cell.innerHTML.trim();
      leftCell.innerHTML = leftContent
        ? leftContent + (rightContent ? " " + rightContent : "")
        : rightContent || "&nbsp;";

      // Update colspan on the left cell
      leftCell.setAttribute("colspan", String(leftColspan + currentColspan));

      // Remove the current cell
      cell.remove();

      // Update the colgroup if it exists
      const colgroup = table.querySelector("colgroup");
      if (colgroup) {
        const cols = colgroup.querySelectorAll("col");
        if (cols[cellIndex]) {
          cols[cellIndex].remove();
        }
      }

      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    });
  }

  // Push current state to undo stack before a modification
  function pushUndoState() {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      setUndoStack((prev) => [...prev.slice(-MAX_UNDO), currentHtml]);
      setRedoStack([]); // Clear redo stack on new action
    }
  }

  // Undo last operation
  function undo() {
    if (undoStack.length === 0) return;
    
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      const previousHtml = undoStack[undoStack.length - 1];
      
      setRedoStack((prev) => [...prev, currentHtml]);
      setUndoStack((prev) => prev.slice(0, -1));
      
      editorRef.current.innerHTML = previousHtml;
      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    }
  }

  // Redo last undone operation
  function redo() {
    if (redoStack.length === 0) return;
    
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      const nextHtml = redoStack[redoStack.length - 1];
      
      setUndoStack((prev) => [...prev, currentHtml]);
      setRedoStack((prev) => prev.slice(0, -1));
      
      editorRef.current.innerHTML = nextHtml;
      updateContentFromEditor();
      setTimeout(() => {
        if (editorRef.current) attachColumnResizers(editorRef.current);
      }, 0);
    }
  }

  // Wrap table operations to push undo state
  function withUndo(operation: () => void) {
    pushUndoState();
    operation();
  }

  // Apply border settings to selected cell(s) or entire table
  function applyBorder(side: "all" | "none" | "top" | "right" | "bottom" | "left") {
    withUndo(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node instanceof HTMLElement) {
          const cell = node.closest("td, th") as HTMLElement | null;
          if (cell) {
            applyBorderToElement(cell, side);
            updateContentFromEditor();
            return;
          }
          const table = node.closest("table") as HTMLElement | null;
          if (table) {
            table.querySelectorAll("td, th").forEach((c) => {
              applyBorderToElement(c as HTMLElement, side);
            });
            updateContentFromEditor();
            return;
          }
        }
        node = node.parentNode;
      }
      // Fallback: apply to all cells in all tables
      if (editorRef.current) {
        editorRef.current
          .querySelectorAll("td, th")
          .forEach((c) => applyBorderToElement(c as HTMLElement, side));
        updateContentFromEditor();
      }
    });
  }

  function applyBorderToElement(el: HTMLElement, side: "all" | "none" | "top" | "right" | "bottom" | "left") {
    if (side === "none") {
      el.style.border = "none";
      el.style.borderTop = "none";
      el.style.borderRight = "none";
      el.style.borderBottom = "none";
      el.style.borderLeft = "none";
      return;
    }
    const style = `${borderWidth}px ${borderStyle} ${borderColor}`;
    switch (side) {
      case "all":
        el.style.border = style;
        break;
      case "top":
        el.style.borderTop = style;
        break;
      case "right":
        el.style.borderRight = style;
        break;
      case "bottom":
        el.style.borderBottom = style;
        break;
      case "left":
        el.style.borderLeft = style;
        break;
    }
  }

  // Attach drag-to-resize handles to every table column inside the editor.
  function attachColumnResizers(root: HTMLElement) {
    const tables = root.querySelectorAll("table");
    tables.forEach((table) => {
      const tbl = table as HTMLElement;
      if (tbl.dataset.resizable === "true") return;
      tbl.dataset.resizable = "true";
      // Ensure the table uses fixed layout so column widths are honored
      tbl.style.tableLayout = "fixed";

      const firstRow = table.querySelector("tr");
      if (!firstRow) return;
      const cells = Array.from(firstRow.children) as HTMLElement[];

      cells.forEach((cell, index) => {
        const handle = document.createElement("div");
        handle.setAttribute("contenteditable", "false");
        handle.style.position = "absolute";
        handle.style.top = "0";
        handle.style.right = "0";
        handle.style.width = "6px";
        handle.style.height = "100%";
        handle.style.cursor = "col-resize";
        handle.style.userSelect = "none";
        handle.style.zIndex = "5";
        (cell as HTMLElement).style.position = "relative";
        cell.appendChild(handle);

        handle.addEventListener("mousedown", (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX;
          const startWidth = cell.offsetWidth;
          const tableWidth = tbl.offsetWidth;
          const onMove = (ev: MouseEvent) => {
            const newWidth = Math.max(20, startWidth + (ev.clientX - startX));
            cell.style.width = `${newWidth}px`;
            // Sync the colgroup col if present
            const col =
              table.querySelectorAll("colgroup col")[index] as HTMLElement | null;
            if (col) col.style.width = `${newWidth}px`;
            // Keep the table width consistent
            (table as HTMLElement).style.width = `${
              tableWidth + (ev.clientX - startX)
            }px`;
          };
          const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            updateContentFromEditor();
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        });
      });
    });
  }

  // Get variable key and label for the current tab
  function getTabVariableInfo(tab: TabKey): { key: string; label: string } {
    if (tab === "labelCard") {
      return { key: "LABEL_TEMPLATE", label: "Label Card Template" };
    }
    return { key: "DELIVERY_TEMPLATE", label: "Delivery Card Template" };
  }

  // Save the template for the current tab
  async function handleSave() {
    updateContentFromEditor();
    const content = htmlContent;
    if (!content.trim()) {
      setMessage({ type: "error", text: "Le template ne peut pas être vide." });
      return;
    }

    const { key, label } = getTabVariableInfo(activeTab);
    const currentTemplate = templatesRef.current[activeTab];
    const currentVariableId = currentTemplate.variableId;

    setSaving(true);
    setMessage(null);
    try {
      if (currentVariableId) {
        // Update existing variable
        const res = await fetch(`/api/admin/variables/${currentVariableId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: content }),
        });
        const data = await res.json();
        if (data.success) {
          // Update cache
          templatesRef.current[activeTab].html = content;
          setVariableId(currentVariableId);
          setMessage({
            type: "success",
            text: `Template "${label}" enregistré avec succès.`,
          });
        } else {
          setMessage({ type: "error", text: data.error || "Erreur lors de l'enregistrement." });
        }
      } else {
        // Create new variable
        const res = await fetch("/api/admin/variables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            label,
            type: "string",
            value: content,
          }),
        });
        const data = await res.json();
        if (data.success) {
          const newId = data.data.id;
          // Update cache
          templatesRef.current[activeTab].html = content;
          templatesRef.current[activeTab].variableId = newId;
          setVariableId(newId);
          setMessage({
            type: "success",
            text: `Template "${label}" créé avec succès.`,
          });
        } else {
          setMessage({ type: "error", text: data.error || "Erreur lors de la création." });
        }
      }
    } catch {
      setMessage({ type: "error", text: "Erreur réseau. Veuillez réessayer." });
    } finally {
      setSaving(false);
    }
  }

  // Toggle source view
  function toggleSource() {
    if (showSource) {
      // Switching from source to editor: sync textarea → htmlContent
      updateContentFromTextarea();
    } else {
      // Switching from editor to source: sync editor → htmlContent (pretty-printed)
      const currentHtml = updateContentFromEditor() || htmlContent;
      const pretty = prettyPrintHtml(currentHtml);
      setHtmlContent(pretty);
      if (codeTextareaRef.current) {
        codeTextareaRef.current.value = pretty;
      }
    }
    setShowSource((prev) => !prev);
  }

  // Pretty-print HTML with proper indentation
  function prettyPrintHtml(html: string): string {
    // Normalize line endings
    let formatted = html.replace(/\r\n?/g, "\n");
    
    // Strip all whitespace between tags first, then insert newlines
    formatted = formatted.replace(/>\s*</g, ">\n<");
    
    // HTML void elements that don't need closing tags
    const voidElements = new Set([
      "area", "base", "br", "col", "embed", "hr", "img", "input",
      "link", "meta", "param", "source", "track", "wbr",
    ]);
    
    // Split into lines and apply indentation
    const lines = formatted.split("\n");
    const result: string[] = [];
    let indent = 0;
    const indentStr = "  ";
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Skip doctype and comments for indentation
      const isDocType = /^<!/.test(trimmed);
      const isComment = /^<!--/.test(trimmed);
      const isClosing = /^<\//.test(trimmed);
      
      // Extract tag name for void element check
      const tagMatch = trimmed.match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
      const isVoid = tagMatch ? voidElements.has(tagMatch[1]) : false;
      const isSelfClosing = /\/>$/.test(trimmed) || isVoid;
      
      // Decrease indent for closing tags before the tag
      if (isClosing) {
        indent--;
      }
      
      result.push(indentStr.repeat(Math.max(0, indent)) + trimmed);
      
      // Increase indent after opening tags
      if (!isClosing && !isSelfClosing && !isDocType && !isComment && /^<[^/!]/.test(trimmed)) {
        indent++;
      }
    }
    
    return result.join("\n");
  }

  // Switch between tabs, preserving the current tab's content in cache
  function switchTab(tab: TabKey) {
    if (tab === activeTab) return;

    // Save current editor content to cache before switching
    const currentHtml = editorRef.current?.innerHTML || htmlContent;
    templatesRef.current[activeTab] = {
      ...templatesRef.current[activeTab],
      html: currentHtml,
    };

    // Switch tab
    const cached = templatesRef.current[tab];
    setActiveTab(tab);
    setHtmlContent(cached.html);
    htmlContentRef.current = cached.html;
    setVariableId(cached.variableId);

    // Update the editor content
    if (editorRef.current) {
      editorRef.current.innerHTML = cached.html;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">Chargement du template...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {/* Font family */}
        <select
          className="h-8 rounded border border-slate-300 bg-white px-2 text-xs"
          onChange={(e) => execCmd("fontName", e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>
            Police
          </option>
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        {/* Font size */}
        <select
          className="h-8 rounded border border-slate-300 bg-white px-2 text-xs"
          onChange={(e) => handleFontSize(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>
            Taille
          </option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="mx-1 h-6 w-px bg-slate-200" />

        {/* Bold */}
        <button
          type="button"
          onClick={() => execCmd("bold")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          title="Gras"
        >
          <Bold className="h-4 w-4" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => execCmd("italic")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          title="Italique"
        >
          <Italic className="h-4 w-4" />
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => execCmd("underline")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          title="Souligné"
        >
          <Underline className="h-4 w-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-slate-200" />

        {/* Text color */}
        <input
          type="color"
          onChange={(e) => execCmd("foreColor", e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-slate-300 p-0.5"
          title="Couleur du texte"
        />

        {/* Background color */}
        <input
          type="color"
          onChange={(e) => execCmd("hiliteColor", e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-slate-300 p-0.5"
          title="Couleur de fond"
        />

        <div className="mx-1 h-6 w-px bg-slate-200" />

        {/* Cell alignment buttons */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Cell</span>
          <button
            type="button"
            onClick={() => execCmd("justifyLeft")}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Aligner à gauche"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("justifyCenter")}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Centrer"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd("justifyRight")}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Aligner à droite"
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <div className="mx-1 h-5 w-px bg-slate-300" />
          <button
            type="button"
            onClick={() => alignCellVertical("top")}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Aligner en haut"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8"/></svg>
          </button>
          <button
            type="button"
            onClick={() => alignCellVertical("middle")}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Centrer verticalement"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8"/></svg>
          </button>
          <button
            type="button"
            onClick={() => alignCellVertical("bottom")}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Aligner en bas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 16h8"/></svg>
          </button>
        </div>

        <div className="mx-1 h-6 w-px bg-slate-200" />

        {/* Table */}
        <button
          type="button"
          onClick={insertTable}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          title="Insérer un tableau"
        >
          <Table className="h-4 w-4" />
        </button>

        {/* Table width buttons */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-2">
          <button
            type="button"
            onClick={() => changeTableWidth("100%")}
            className={`rounded p-1.5 transition-colors ${
              tableWidth === "100%"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            title="Tableau pleine largeur (100%)"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => changeTableWidth("75%")}
            className={`rounded p-1.5 transition-colors ${
              tableWidth === "75%"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            title="Tableau 75% largeur"
          >
            <PanelRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => changeTableWidth("50%")}
            className={`rounded p-1.5 transition-colors ${
              tableWidth === "50%"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            title="Tableau 50% largeur"
          >
            <Columns className="h-4 w-4" />
          </button>
        </div>

        {/* Table alignment buttons */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Table</span>
          <button
            type="button"
            onClick={() => alignTable("left")}
            className="rounded p-1.5 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
            title="Aligner le tableau à gauche"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => alignTable("center")}
            className="rounded p-1.5 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
            title="Centrer le tableau"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => alignTable("right")}
            className="rounded p-1.5 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
            title="Aligner le tableau à droite"
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>

        {/* QR code */}
        <button
          type="button"
          onClick={insertQrCode}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          title="Insérer un QR code ({{name}})"
        >
          <QrCode className="h-4 w-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-slate-200" />

        {/* Row operations */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Lignes</span>
          <button
            type="button"
            onClick={addRowBefore}
            className="rounded p-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
            title="Ajouter une ligne au-dessus"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="block"><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
          </button>
          <button
            type="button"
            onClick={addRowAfter}
            className="rounded p-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
            title="Ajouter une ligne en dessous"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="block"><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </button>
          <button
            type="button"
            onClick={deleteRow}
            className="rounded p-1.5 text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors"
            title="Supprimer la ligne"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-1 h-6 w-px bg-slate-200" />

        {/* Column operations */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Cols</span>
          <button
            type="button"
            onClick={addColumnBefore}
            className="rounded p-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
            title="Ajouter une colonne à gauche"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="block"><rect x="4" y="3" width="4" height="18" rx="1"/><rect x="16" y="3" width="4" height="18" rx="1"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </button>
          <button
            type="button"
            onClick={addColumnAfter}
            className="rounded p-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
            title="Ajouter une colonne à droite"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="block"><rect x="4" y="3" width="4" height="18" rx="1"/><rect x="16" y="3" width="4" height="18" rx="1"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
          </button>
          <button
            type="button"
            onClick={deleteColumn}
            className="rounded p-1.5 text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors"
            title="Supprimer la colonne"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="mx-1 h-5 w-px bg-slate-300" />
          <button
            type="button"
            onClick={mergeCellLeft}
            className="rounded p-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
            title="Fusionner avec la cellule de gauche"
          >
            <Merge className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-1 h-6 w-px bg-slate-200" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-2">
          <button
            type="button"
            onClick={undo}
            disabled={undoStack.length === 0}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={redoStack.length === 0}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Rétablir (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-1 h-6 w-px bg-slate-200" />

        {/* Delete table */}
        <button
          type="button"
          onClick={deleteTable}
          className="rounded p-1.5 text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors"
          title="Supprimer le tableau"
        >
          <Table className="h-4 w-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-slate-200" />

        {/* Excel-style border picker */}
        <div className="relative" ref={borderPickerRef}>
          <button
            type="button"
            onClick={() => setBorderPickerOpen(!borderPickerOpen)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
              borderPickerOpen
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            title="Bordures"
          >
            <Grid2X2 className="h-4 w-4" />
            <span>Bordure</span>
          </button>

          {borderPickerOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
              {/* Border style selector */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Style
                </label>
                <select
                  value={borderStyle}
                  onChange={(e) => setBorderStyle(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="solid">Continu</option>
                  <option value="dashed">Pointillés</option>
                  <option value="dotted">Points</option>
                  <option value="double">Double</option>
                </select>
              </div>

              {/* Border width selector */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Épaisseur
                </label>
                <select
                  value={borderWidth}
                  onChange={(e) => setBorderWidth(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="1">Fine (1px)</option>
                  <option value="2">Moyenne (2px)</option>
                  <option value="3">Épaisse (3px)</option>
                  <option value="4">Très épaisse (4px)</option>
                </select>
              </div>

              {/* Border color picker */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Couleur
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-slate-300"
                  />
                  <span className="text-xs text-slate-500">{borderColor}</span>
                </div>
              </div>

              {/* Border preview */}
              <div className="mb-3 rounded border border-slate-200 p-2">
                <div
                  className="mx-auto h-16 w-24"
                  style={{
                    border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                  }}
                />
              </div>

              {/* Border grid - Excel style */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Appliquer à
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => applyBorder("top")}
                    className="rounded border border-slate-200 p-2 hover:bg-slate-50 transition-colors"
                    title="Bordure du haut"
                  >
                    <div className="flex justify-center">
                      <div
                        className="w-8"
                        style={{
                          borderTop: `${borderWidth}px ${borderStyle} ${borderColor}`,
                        }}
                      />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBorder("all")}
                    className="rounded border border-slate-200 p-2 hover:bg-slate-50 transition-colors"
                    title="Toutes les bordures"
                  >
                    <div className="flex justify-center">
                      <div
                        className="h-6 w-6"
                        style={{
                          border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                        }}
                      />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBorder("right")}
                    className="rounded border border-slate-200 p-2 hover:bg-slate-50 transition-colors"
                    title="Bordure de droite"
                  >
                    <div className="flex justify-center">
                      <div
                        className="h-8"
                        style={{
                          borderRight: `${borderWidth}px ${borderStyle} ${borderColor}`,
                        }}
                      />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBorder("left")}
                    className="rounded border border-slate-200 p-2 hover:bg-slate-50 transition-colors"
                    title="Bordure de gauche"
                  >
                    <div className="flex justify-center">
                      <div
                        className="h-8"
                        style={{
                          borderLeft: `${borderWidth}px ${borderStyle} ${borderColor}`,
                        }}
                      />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBorder("none")}
                    className="rounded border border-slate-200 p-2 hover:bg-slate-50 transition-colors"
                    title="Supprimer les bordures"
                  >
                    <div className="flex justify-center">
                      <div className="h-6 w-6 relative">
                        <div
                          className="absolute inset-0"
                          style={{
                            border: `1px dashed ${borderColor}40`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg text-slate-400">×</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBorder("bottom")}
                    className="rounded border border-slate-200 p-2 hover:bg-slate-50 transition-colors"
                    title="Bordure du bas"
                  >
                    <div className="flex justify-center">
                      <div
                        className="w-8"
                        style={{
                          borderBottom: `${borderWidth}px ${borderStyle} ${borderColor}`,
                        }}
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Source toggle */}
        <button
          type="button"
          onClick={toggleSource}
          className={`rounded p-1.5 transition-colors ${
            showSource
              ? "bg-slate-200 text-slate-900"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
          title="Code source"
        >
          {showSource ? <EyeOff className="h-4 w-4" /> : <Code className="h-4 w-4" />}
        </button>
      </div>

      {/* Placeholder insert bar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <span className="mr-1 text-xs font-medium text-slate-500">
          Placeholders :
        </span>
        {PLACEHOLDERS.map((ph) => (
          <button
            key={ph.token}
            type="button"
            onClick={() => insertPlaceholder(ph.token)}
            className="rounded bg-white px-2 py-1 text-xs font-mono text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
            title={ph.label}
          >
            {ph.token}
          </button>
        ))}
      </div>

      {/* Template tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => switchTab("labelCard")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "labelCard"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Etiquette de stockage
        </button>
        <button
          type="button"
          onClick={() => switchTab("deliveryCard")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "deliveryCard"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Etiquette de livraison
        </button>
      </div>

      {/* Editor area */}
      <div
        className={`rounded-lg border ${
          showSource ? "border-transparent" : "border-slate-200"
        }`}
      >
        {showSource ? (
          <textarea
            ref={codeTextareaRef}
            defaultValue={htmlContent}
            className="w-full min-h-[400px] rounded-lg border border-slate-300 bg-slate-900 p-4 font-mono text-sm text-green-300 focus:outline-none focus:ring-1 focus:ring-slate-500"
            spellCheck={false}
            onChange={updateContentFromTextarea}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            className="min-h-[400px] rounded-lg border border-slate-300 bg-white p-4 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            onInput={updateContentFromEditor}
            onKeyDown={handleKeyDown}
            onKeyUp={(e) => {
              // Handle Enter key to insert a newline instead of div
              if (e.key === "Enter") {
                // execCommand('insertLineBreak') works better in contentEditable
              }
            }}
            suppressContentEditableWarning
          />
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving
            ? "Enregistrement..."
            : `Enregistrer ${activeTab === "labelCard" ? "Etiquette de stockage" : "Etiquette de livraison"}`}
        </button>

      </div>

      {/* Preview info */}
      {/* Preview section removed */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default templates
// ---------------------------------------------------------------------------
function getDefaultTemplate(): string {
  return `
<div style="font-family: Arial, sans-serif; max-width: 300px; border: 1px solid #000; padding: 12px; text-align: center;">
  <h2 style="font-size: 14px; margin: 0 0 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">
    ALBELT – {{name}}
  </h2>
  <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Atelier</td><td style="text-align: right; padding: 2px 4px;">{{atelier}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Dimensions</td><td style="text-align: right; padding: 2px 4px;">{{dimensions}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Surface</td><td style="text-align: right; padding: 2px 4px;">{{surface}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Nature</td><td style="text-align: right; padding: 2px 4px;">{{nature}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Couleur</td><td style="text-align: right; padding: 2px 4px;">{{color}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Épaisseur</td><td style="text-align: right; padding: 2px 4px;">{{thickness}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Plis</td><td style="text-align: right; padding: 2px 4px;">{{plies}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Motif</td><td style="text-align: right; padding: 2px 4px;">{{motif}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Commande</td><td style="text-align: right; padding: 2px 4px;">{{commande}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Date</td><td style="text-align: right; padding: 2px 4px;">{{date}}</td></tr>
  </table>
</div>
`.trim();
}

function getDeliveryDefaultTemplate(): string {
  return `
<div style="font-family: Arial, sans-serif; max-width: 300px; border: 1px solid #000; padding: 12px; text-align: center;">
  <h2 style="font-size: 14px; margin: 0 0 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">
    BON DE LIVRAISON – {{name}}
  </h2>
  <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Atelier</td><td style="text-align: right; padding: 2px 4px;">{{atelier}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Dimensions</td><td style="text-align: right; padding: 2px 4px;">{{dimensions}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Surface</td><td style="text-align: right; padding: 2px 4px;">{{surface}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Commande</td><td style="text-align: right; padding: 2px 4px;">{{commande}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Date</td><td style="text-align: right; padding: 2px 4px;">{{date}}</td></tr>
  </table>
  <div style="margin-top: 8px; font-size: 10px; border-top: 1px solid #333; padding-top: 4px;">
    Signature : ____________________
  </div>
</div>
`.trim();
}
