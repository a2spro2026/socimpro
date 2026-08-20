import ScrollAreaWithArrows from './ScrollAreaWithArrows';

export const TABLE_SCROLL_MAX_HEIGHT = 'min(42vh, 380px)';

export const tableHeadClass = 'sticky top-0 z-10';

export const tableHeadRowClass =
    'bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm';

export default function TableScrollArea({
    children,
    deps = [],
    className = '',
    maxHeight = TABLE_SCROLL_MAX_HEIGHT,
    ...props
}) {
    return (
        <ScrollAreaWithArrows variant="table"
            className={`rounded-b-2xl ${className}`.trim()}
            maxHeight={maxHeight}
            deps={deps}
            {...props}
        >
            {children}
        </ScrollAreaWithArrows>
    );
}

export function TableCard({ children, className = '', header, headerClassName = '' }) {
    return (
        <div className={`glass-card shadow-card border border-slate-200/60 dark:border-slate-700/60 rounded-2xl ${className}`.trim()}>
            {header ? (
                <div className={`px-5 py-3.5 border-b border-white/10 rounded-t-2xl ${headerClassName}`.trim()}>
                    {header}
                </div>
            ) : null}
            {children}
        </div>
    );
}
