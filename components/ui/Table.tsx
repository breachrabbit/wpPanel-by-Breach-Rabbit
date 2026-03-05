'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Table Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Sorting, pagination, row selection, bulk actions, sticky header, responsive
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type TableSize = 'sm' | 'md' | 'lg';
export type SortDirection = 'asc' | 'desc' | null;

export interface TableColumn<T = any> {
  /** Unique column identifier */
  key: string;
  
  /** Column header label */
  label: string;
  
  /** Column width (optional) */
  width?: string | number;
  
  /** Is column sortable */
  sortable?: boolean;
  
  /** Is column visible */
  visible?: boolean;
  
  /** Cell renderer */
  render?: (item: T, index: number) => React.ReactNode;
  
  /** Header renderer (for custom header content) */
  renderHeader?: () => React.ReactNode;
  
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  
  /** Don't wrap text */
  nowrap?: boolean;
}

export interface TableProps<T = any> extends React.ComponentPropsWithoutRef<'div'> {
  /** Table data */
  data: T[];
  
  /** Column definitions */
  columns: TableColumn<T>[];
  
  /** Table size */
  size?: TableSize;
  
  /** Enable row selection */
  selectable?: boolean;
  
  /** Selected row IDs */
  selectedIds?: string[];
  
  /** On selection change */
  onSelectionChange?: (ids: string[]) => void;
  
  /** Get row ID */
  getRowId?: (item: T, index: number) => string;
  
  /** Enable sorting */
  sortable?: boolean;
  
  /** Current sort column */
  sortColumn?: string;
  
  /** Current sort direction */
  sortDirection?: SortDirection;
  
  /** On sort change */
  onSortChange?: (column: string, direction: SortDirection) => void;
  
  /** Enable pagination */
  pagination?: boolean;
  
  /** Current page */
  page?: number;
  
  /** Page size */
  pageSize?: number;
  
  /** Total items (for server-side pagination) */
  totalItems?: number;
  
  /** On page change */
  onPageChange?: (page: number) => void;
  
  /** On page size change */
  onPageSizeChange?: (pageSize: number) => void;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Empty state message */
  emptyMessage?: string;
  
  /** Enable sticky header */
  stickyHeader?: boolean;
  
  /** Enable row hover highlight */
  hoverable?: boolean;
  
  /** On row click */
  onRowClick?: (item: T, index: number) => void;
  
  /** Custom row class name */
  rowClassName?: (item: T, index: number) => string;
  
  /** Custom cell class name */
  cellClassName?: (item: T, column: TableColumn<T>, index: number) => string;
  
  /** Bulk actions */
  bulkActions?: Array<{
    label: string;
    onClick: (selectedIds: string[]) => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

// =============================================================================
// ⚙️ SIZE CONFIGURATIONS
// =============================================================================

/**
 * Size configurations
 */
const sizeStyles: Record<TableSize, {
  row: string;
  cell: string;
  header: string;
  font: string;
}> = {
  sm: {
    row: 'h-10',
    cell: 'px-3 py-2',
    header: 'px-3 py-2.5',
    font: 'text-xs',
  },
  md: {
    row: 'h-12',
    cell: 'px-4 py-3',
    header: 'px-4 py-3',
    font: 'text-sm',
  },
  lg: {
    row: 'h-14',
    cell: 'px-5 py-4',
    header: 'px-5 py-4',
    font: 'text-base',
  },
};

// =============================================================================
// 🔧 HELPER COMPONENTS
// =============================================================================

/**
 * SortIcon — Displays sort direction indicator
 */
interface SortIconProps {
  direction: SortDirection;
  className?: string;
}

function SortIcon({ direction, className }: SortIconProps) {
  if (direction === 'asc') {
    return <ChevronUp className={cn('w-4 h-4', className)} aria-hidden="true" />;
  }
  if (direction === 'desc') {
    return <ChevronDown className={cn('w-4 h-4', className)} aria-hidden="true" />;
  }
  return <ChevronsUpDown className={cn('w-4 h-4 opacity-30', className)} aria-hidden="true" />;
}

/**
 * Pagination — Table pagination controls
 */
interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'flex-wrap gap-4',
        'px-4 py-3',
        'border-t border-border',
        'bg-bg-surface',
        className
      )}
      role="navigation"
      aria-label="Table pagination"
    >
      {/* Page size selector */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={cn(
              'h-8 px-2',
              'text-xs',
              'bg-bg-base',
              'border border-border',
              'rounded-md',
              'text-text-primary',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-0',
              'cursor-pointer'
            )}
            aria-label="Select page size"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Page info */}
      <div className="text-xs text-text-muted">
        Showing {startItem} to {endItem} of {totalItems} entries
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className={cn(
            'h-8 w-8',
            'flex items-center justify-center',
            'rounded-md',
            'text-text-secondary',
            'hover:bg-bg-overlay',
            'disabled:opacity-30 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          aria-label="First page"
        >
          <ChevronLeft className="w-4 h-4" />
          <ChevronLeft className="w-4 h-4 -ml-2" />
        </button>

        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={cn(
            'h-8 w-8',
            'flex items-center justify-center',
            'rounded-md',
            'text-text-secondary',
            'hover:bg-bg-overlay',
            'disabled:opacity-30 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-2">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'h-8 w-8',
                  'flex items-center justify-center',
                  'rounded-md',
                  'text-sm font-medium',
                  'transition-colors',
                  page === pageNum
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:bg-bg-overlay'
                )}
                aria-label={`Page ${pageNum}`}
                aria-current={page === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={cn(
            'h-8 w-8',
            'flex items-center justify-center',
            'rounded-md',
            'text-text-secondary',
            'hover:bg-bg-overlay',
            'disabled:opacity-30 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className={cn(
            'h-8 w-8',
            'flex items-center justify-center',
            'rounded-md',
            'text-text-secondary',
            'hover:bg-bg-overlay',
            'disabled:opacity-30 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          aria-label="Last page"
        >
          <ChevronRight className="w-4 h-4" />
          <ChevronRight className="w-4 h-4 -ml-2" />
        </button>
      </div>
    </div>
  );
}

/**
 * Table Skeleton — Loading state placeholder
 */
interface TableSkeletonProps {
  columns: TableColumn[];
  rows?: number;
  size?: TableSize;
  selectable?: boolean;
  className?: string;
}

function TableSkeleton({
  columns,
  rows = 5,
  size = 'md',
  selectable = false,
  className,
}: TableSkeletonProps) {
  const sizes = sizeStyles[size];

  return (
    <div className={cn('animate-pulse', className)}>
      <table className="w-full">
        <thead>
          <tr className={cn('border-b border-border', sizes.header)}>
            {selectable && (
              <th className={cn(sizes.header, 'w-12')} />
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  sizes.header,
                  'text-left',
                  'font-medium',
                  'text-text-muted'
                )}
                style={{ width: column.width }}
              >
                <div className={cn('h-4 bg-bg-overlay rounded', sizes.font)} style={{ width: '60%' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className={cn('border-b border-border', sizes.row)}>
              {selectable && (
                <td className={cn(sizes.cell, 'w-12')} />
              )}
              {columns.map((column) => (
                <td key={column.key} className={sizes.cell}>
                  <div className={cn('h-4 bg-bg-overlay rounded', sizes.font)} style={{ width: `${40 + Math.random() * 40}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// 🏗️ TABLE COMPONENT
// =============================================================================

/**
 * Table Component — wpPanel by Breach Rabbit UI
 * 
 * Full-featured data table with sorting, pagination, selection, and bulk actions.
 * Optimized for performance with large datasets.
 * 
 * @example
 * <Table 
 *   data={sites} 
 *   columns={columns} 
 *   sortable 
 *   pagination 
 *   selectable 
 * />
 */
export function Table<T = any>({
  data,
  columns,
  size = 'md',
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId,
  sortable = false,
  sortColumn,
  sortDirection,
  onSortChange,
  pagination = false,
  page = 1,
  pageSize = 10,
  totalItems,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  emptyMessage = 'No data available',
  stickyHeader = false,
  hoverable = true,
  onRowClick,
  rowClassName,
  cellClassName,
  bulkActions,
  className,
  ...props
}: TableProps<T>) {
  const sizes = sizeStyles[size];
  const visibleColumns = columns.filter((col) => col.visible !== false);
  const effectiveTotal = totalItems ?? data.length;

  // Handle select all
  const allSelected = selectable && data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectable && selectedIds.length > 0 && selectedIds.length < data.length;

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      const allIds = data.map((item, index) => 
        getRowId?.(item, index) ?? String(index)
      );
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    }
  };

  const handleSort = (column: TableColumn<T>) => {
    if (!sortable || !column.sortable || !onSortChange) return;

    let newDirection: SortDirection = 'asc';
    if (sortColumn === column.key) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = null;
      }
    }

    onSortChange(column.key, newDirection);
  };

  // Pagination slice (client-side)
  const paginatedData = pagination && !totalItems
    ? data.slice((page - 1) * pageSize, page * pageSize)
    : data;

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn('bg-bg-surface border border-border rounded-md overflow-hidden', className)}
        {...props}
      >
        <TableSkeleton
          columns={visibleColumns}
          rows={pageSize}
          size={size}
          selectable={selectable}
        />
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div
        className={cn(
          'bg-bg-surface border border-border rounded-md',
          'flex flex-col items-center justify-center',
          'py-12 px-4',
          'text-center',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'w-12 h-12',
            'rounded-full',
            'bg-bg-overlay',
            'flex items-center justify-center',
            'mb-3'
          )}
        >
          <svg
            className="w-6 h-6 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-bg-surface border border-border rounded-md overflow-hidden',
        className
      )}
      {...props}
    >
      {/* Bulk Actions Bar */}
      {selectable && selectedIds.length > 0 && bulkActions && (
        <div
          className={cn(
            'flex items-center justify-between',
            'px-4 py-2',
            'bg-bg-overlay',
            'border-b border-border'
          )}
          role="status"
          aria-live="polite"
        >
          <span className={cn('text-sm font-medium', sizes.font)}>
            {selectedIds.length} row{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, index) => (
              <button
                key={index}
                onClick={() => action.onClick(selectedIds)}
                className={cn(
                  'px-3 py-1.5',
                  'rounded-md',
                  'text-sm font-medium',
                  'transition-colors',
                  action.variant === 'danger'
                    ? 'bg-error-subtle text-error hover:bg-error/20'
                    : action.variant === 'primary'
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'bg-bg-base text-text-primary border border-border hover:bg-bg-elevated'
                )}
              >
                {action.label}
              </button>
            ))}
            <button
              onClick={() => onSelectionChange?.([])}
              className={cn(
                'px-3 py-1.5',
                'rounded-md',
                'text-sm font-medium',
                'text-text-muted',
                'hover:text-text-primary',
                'hover:bg-bg-base',
                'transition-colors'
              )}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className={cn('overflow-auto', stickyHeader && 'max-h-[calc(100vh-200px)]')}>
        <table className="w-full" role="grid">
          {/* Table Header */}
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="border-b border-border bg-bg-surface">
              {/* Selection Column */}
              {selectable && (
                <th
                  className={cn(
                    sizes.header,
                    'w-12',
                    'text-left',
                    'font-medium',
                    'text-text-muted'
                  )}
                  scope="col"
                >
                  <button
                    onClick={() => handleSelectAll(!allSelected)}
                    className={cn(
                      'w-4 h-4',
                      'rounded',
                      'border border-border',
                      'flex items-center justify-center',
                      'transition-colors',
                      allSelected ? 'bg-accent border-accent' : 'bg-bg-base hover:border-border-hover',
                      someSelected && !allSelected && 'bg-accent/50'
                    )}
                    aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                    aria-checked={allSelected}
                    role="checkbox"
                  >
                    {allSelected && (
                      <Check className="w-3 h-3 text-white" aria-hidden="true" />
                    )}
                    {someSelected && !allSelected && (
                      <Check className="w-3 h-3 text-white/70" aria-hidden="true" />
                    )}
                  </button>
                </th>
              )}

              {/* Data Columns */}
              {visibleColumns.map((column) => {
                const isSorted = sortColumn === column.key;
                const canSort = sortable && column.sortable;

                return (
                  <th
                    key={column.key}
                    className={cn(
                      sizes.header,
                      'text-left',
                      'font-medium',
                      'text-text-muted',
                      sizes.font,
                      column.nowrap && 'whitespace-nowrap',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      canSort && 'cursor-pointer hover:text-text-primary',
                      'transition-colors'
                    )}
                    style={{ width: column.width }}
                    scope="col"
                    onClick={() => handleSort(column)}
                    aria-sort={
                      isSorted
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : sortDirection === 'desc'
                          ? 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      {column.renderHeader?.() ?? column.label}
                      {canSort && (
                        <SortIcon
                          direction={isSorted ? sortDirection : null}
                          className={cn(isSorted && 'text-accent')}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {paginatedData.map((item, rowIndex) => {
              const rowId = getRowId?.(item, rowIndex) ?? String(rowIndex);
              const isSelected = selectedIds.includes(rowId);
              const customRowClass = rowClassName?.(item, rowIndex);

              return (
                <tr
                  key={rowId}
                  className={cn(
                    'border-b border-border last:border-0',
                    sizes.row,
                    hoverable && 'hover:bg-bg-overlay',
                    isSelected && 'bg-accent-subtle',
                    onRowClick && 'cursor-pointer',
                    customRowClass,
                    'transition-colors'
                  )}
                  onClick={() => onRowClick?.(item, rowIndex)}
                  role="row"
                  aria-selected={isSelected}
                >
                  {/* Selection Cell */}
                  {selectable && (
                    <td
                      className={cn(
                        sizes.cell,
                        'w-12',
                        'text-center'
                      )}
                      role="gridcell"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRow(rowId, !isSelected);
                        }}
                        className={cn(
                          'w-4 h-4',
                          'rounded',
                          'border border-border',
                          'flex items-center justify-center',
                          'transition-colors',
                          isSelected ? 'bg-accent border-accent' : 'bg-bg-base hover:border-border-hover'
                        )}
                        aria-label={isSelected ? `Deselect row ${rowId}` : `Select row ${rowId}`}
                        aria-checked={isSelected}
                        role="checkbox"
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-white" aria-hidden="true" />
                        )}
                      </button>
                    </td>
                  )}

                  {/* Data Cells */}
                  {visibleColumns.map((column) => {
                    const customCellClass = cellClassName?.(item, column, rowIndex);

                    return (
                      <td
                        key={`${rowId}-${column.key}`}
                        className={cn(
                          sizes.cell,
                          sizes.font,
                          'text-text-primary',
                          column.nowrap && 'whitespace-nowrap',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          customCellClass
                        )}
                        role="gridcell"
                      >
                        {column.render
                          ? column.render(item, rowIndex)
                          : String(item[column.key as keyof T] ?? '')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={effectiveTotal}
          onPageChange={onPageChange ?? (() => {})}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      )}
    </div>
  );
}

// =============================================================================
// 📦 TABLE SUB-COMPONENTS
// =============================================================================

/**
 * Table.Root — Alias for Table (for consistency with other components)
 */
export const TableRoot = Table;

/**
 * Table.Header — Semantic table header (for custom table structures)
 */
export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentPropsWithoutRef<'thead'>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('bg-bg-surface border-b border-border', className)}
    {...props}
  />
));

TableHeader.displayName = 'TableHeader';

/**
 * Table.Body — Semantic table body (for custom table structures)
 */
export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentPropsWithoutRef<'tbody'>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn(className)} {...props} />
));

TableBody.displayName = 'TableBody';

/**
 * Table.Row — Table row (for custom table structures)
 */
export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.ComponentPropsWithoutRef<'tr'>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-border last:border-0',
      'hover:bg-bg-overlay',
      'transition-colors',
      className
    )}
    {...props}
  />
));

TableRow.displayName = 'TableRow';

/**
 * Table.HeaderCell — Table header cell (for custom table structures)
 */
export const TableHeaderCell = React.forwardRef<
  HTMLTableHeaderCellElement,
  React.ComponentPropsWithoutRef<'th'>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'px-4 py-3',
      'text-left',
      'text-sm font-medium',
      'text-text-muted',
      className
    )}
    {...props}
  />
));

TableHeaderCell.displayName = 'TableHeaderCell';

/**
 * Table.Cell — Table data cell (for custom table structures)
 */
export const TableCell = React.forwardRef<
  HTMLTableDataCellElement,
  React.ComponentPropsWithoutRef<'td'>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-4 py-3',
      'text-sm',
      'text-text-primary',
      className
    )}
    {...props}
  />
));

TableCell.displayName = 'TableCell';

/**
 * Table.Caption — Table caption (for accessibility)
 */
export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.ComponentPropsWithoutRef<'caption'>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      'mt-2',
      'text-sm',
      'text-text-muted',
      'text-center',
      className
    )}
    {...props}
  />
));

TableCaption.displayName = 'TableCaption';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  TableProps,
  TableColumn,
  TableSize,
  SortDirection,
  PaginationProps,
  TableSkeletonProps,
};

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Table } from '@/components/ui/Table';
 * 
 * // Simple table
 * <Table 
 *   data={sites} 
 *   columns={[
 *     { key: 'domain', label: 'Domain' },
 *     { key: 'status', label: 'Status' },
 *     { key: 'phpVersion', label: 'PHP Version' },
 *   ]} 
 * />
 * 
 * // With sorting
 * <Table 
 *   data={sites} 
 *   columns={[
 *     { key: 'domain', label: 'Domain', sortable: true },
 *     { key: 'status', label: 'Status', sortable: true },
 *     { key: 'createdAt', label: 'Created', sortable: true },
 *   ]} 
 *   sortable
 *   sortColumn={sortColumn}
 *   sortDirection={sortDirection}
 *   onSortChange={handleSort}
 * />
 * 
 * // With pagination
 * <Table 
 *   data={sites} 
 *   columns={columns} 
 *   pagination
 *   page={page}
 *   pageSize={pageSize}
 *   totalItems={totalSites}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 * />
 * 
 * // With row selection
 * <Table 
 *   data={sites} 
 *   columns={columns} 
 *   selectable
 *   selectedIds={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   bulkActions={[
 *     { label: 'Delete', onClick: handleBulkDelete, variant: 'danger' },
 *     { label: 'Export', onClick: handleBulkExport },
 *   ]}
 * />
 * 
 * // With custom cell renderer
 * <Table 
 *   data={sites} 
 *   columns={[
 *     { 
 *       key: 'domain', 
 *       label: 'Domain',
 *       render: (site) => (
 *         <a href={`/sites/${site.id}`} className="text-accent hover:underline">
 *           {site.domain}
 *         </a>
 *       )
 *     },
 *     { 
 *       key: 'status', 
 *       label: 'Status',
 *       render: (site) => <StatusBadge status={site.status} />
 *     },
 *   ]} 
 * />
 * 
 * // With loading state
 * <Table 
 *   data={sites} 
 *   columns={columns} 
 *   isLoading={isLoading}
 * />
 * 
 * // With sticky header
 * <Table 
 *   data={sites} 
 *   columns={columns} 
 *   stickyHeader
 * />
 * 
 * // With row click handler
 * <Table 
 *   data={sites} 
 *   columns={columns} 
 *   onRowClick={(site) => router.push(`/sites/${site.id}`)}
 * />
 * 
 * // Different sizes
 * <Table size="sm" data={sites} columns={columns} />
 * <Table size="md" data={sites} columns={columns} />
 * <Table size="lg" data={sites} columns={columns} />
 * 
 * // Custom table structure (using sub-components)
 * <table>
 *   <TableCaption>List of sites</TableCaption>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHeaderCell>Domain</TableHeaderCell>
 *       <TableHeaderCell>Status</TableHeaderCell>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     {sites.map((site) => (
 *       <TableRow key={site.id}>
 *         <TableCell>{site.domain}</TableCell>
 *         <TableCell><StatusBadge status={site.status} /></TableCell>
 *       </TableRow>
 *     ))}
 *   </TableBody>
 * </table>
 * 
 * // Sites list example
 * function SitesTable() {
 *   const {  sites, isLoading } = useQuery({ queryKey: ['sites'], queryFn: fetchSites });
 *   const [selectedIds, setSelectedIds] = useState<string[]>([]);
 *   const [page, setPage] = useState(1);
 *   const [pageSize, setPageSize] = useState(10);
 *   
 *   const columns: TableColumn<Site>[] = [
 *     { 
 *       key: 'domain', 
 *       label: 'Domain',
 *       sortable: true,
 *       render: (site) => (
 *         <a href={`/sites/${site.id}`} className="text-accent hover:underline">
 *           {site.domain}
 *         </a>
 *       )
 *     },
 *     { 
 *       key: 'status', 
 *       label: 'Status',
 *       sortable: true,
 *       render: (site) => <StatusBadge status={site.status} />
 *     },
 *     { 
 *       key: 'sslStatus', 
 *       label: 'SSL',
 *       render: (site) => <StatusBadge status={site.sslStatus} />
 *     },
 *     { 
 *       key: 'phpVersion', 
 *       label: 'PHP',
 *       align: 'center',
 *     },
 *     { 
 *       key: 'createdAt', 
 *       label: 'Created',
 *       sortable: true,
 *       render: (site) => formatDate(site.createdAt)
 *     },
 *   ];
 *   
 *   return (
 *     <Table
 *       data={sites || []}
 *       columns={columns}
 *       isLoading={isLoading}
 *       sortable
 *       pagination
 *       page={page}
 *       pageSize={pageSize}
 *       totalItems={totalSites}
 *       onPageChange={setPage}
 *       onPageSizeChange={setPageSize}
 *       selectable
 *       selectedIds={selectedIds}
 *       onSelectionChange={setSelectedIds}
 *       bulkActions={[
 *         { label: 'Delete', onClick: handleBulkDelete, variant: 'danger' },
 *         { label: 'Export', onClick: handleBulkExport },
 *       ]}
 *       onRowClick={(site) => router.push(`/sites/${site.id}`)}
 *     />
 *   );
 * }
 * 
 * // Backups table example
 * function BackupsTable() {
 *   const columns: TableColumn<Backup>[] = [
 *     { 
 *       key: 'type', 
 *       label: 'Type',
 *       render: (backup) => (
 *         <span className="capitalize">{backup.type}</span>
 *       )
 *     },
 *     { 
 *       key: 'size', 
 *       label: 'Size',
 *       align: 'right',
 *       render: (backup) => formatFileSize(backup.sizeBytes)
 *     },
 *     { 
 *       key: 'status', 
 *       label: 'Status',
 *       render: (backup) => <StatusBadge status={backup.status} />
 *     },
 *     { 
 *       key: 'createdAt', 
 *       label: 'Created',
 *       sortable: true,
 *       render: (backup) => formatRelativeTime(backup.createdAt)
 *     },
 *     { 
 *       key: 'actions', 
 *       label: '',
 *       render: (backup) => (
 *         <div className="flex gap-2">
 *           <Button size="sm" variant="ghost">Restore</Button>
 *           <Button size="sm" variant="ghost">Download</Button>
 *         </div>
 *       )
 *     },
 *   ];
 *   
 *   return <Table data={backups} columns={columns} pagination />;
 * }
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Table Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-surface:     #101010 (dark) / #ffffff (light) — table background
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — row hover
 * - bg-base:        #080808 (dark) / #f8f8f8 (light) — checkbox background
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light) — cell text
 * - text-muted:     #444444 (dark) / #999999 (light) — header text
 * - accent:         #3b82f6 (Blue) — selected rows, sort indicators
 * - accent-subtle:  rgba(59,130,246,0.10) — selected row background
 * 
 * Sizing:
 * - sm:  row: h-10 (40px), cell: px-3 py-2, font: text-xs
 * - md:  row: h-12 (48px), cell: px-4 py-3, font: text-sm — DEFAULT
 * - lg:  row: h-14 (56px), cell: px-5 py-4, font: text-base
 * 
 * Border Radius:
 * - Table container: rounded-md (6px)
 * - Checkboxes: rounded (4px)
 * - Pagination buttons: rounded-md (6px)
 * 
 * Features:
 * - Sticky header (optional, max-h container)
 * - Row hover highlight
 * - Row selection with checkboxes
 * - Bulk actions bar
 * - Sortable columns with indicators
 * - Client-side and server-side pagination
 * - Loading skeleton state
 * - Empty state with icon
 * - Responsive overflow (horizontal scroll)
 * 
 * Accessibility:
 * - role="grid" for table
 * - role="row" for rows
 * - role="gridcell" for cells
 * - role="checkbox" for selection checkboxes
 * - aria-sort for sortable columns
 * - aria-selected for selected rows
 * - aria-label for pagination controls
 * - aria-current for current page
 * - TableCaption for descriptions
 * 
 * Performance:
 * - CSS-first (no JS for hover states)
 * - Virtual scrolling ready (can be added for 1000+ rows)
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Sites list (domain, status, SSL, PHP, created)
 * - Databases list (name, engine, size, users)
 * - Backups list (type, size, status, created, actions)
 * - SSL certificates (domain, issuer, expires, status)
 * - Cron jobs (command, schedule, last run, status)
 * - Firewall rules (action, port, protocol, IP)
 * - Users list (email, role, 2FA, last login)
 * - Activity logs (action, user, resource, timestamp)
 * - WP plugins/themes (name, version, status, update)
 * - Monitoring alerts (type, severity, status, time)
 */