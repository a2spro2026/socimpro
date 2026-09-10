<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class UniqueArticleRefs
{
    /**
     * Refuse the same article_ref twice in one document (case-insensitive).
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    public static function assert(array $items, string $field = 'article_ref'): void
    {
        $seen = [];

        foreach ($items as $index => $item) {
            $ref = mb_strtolower(trim((string) ($item[$field] ?? '')));
            if ($ref === '') {
                continue;
            }

            if (isset($seen[$ref])) {
                throw ValidationException::withMessages([
                    "items.{$index}.{$field}" => 'Cette référence est déjà saisie sur une autre ligne.',
                ]);
            }

            $seen[$ref] = true;
        }
    }
}
