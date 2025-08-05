import { describe, expect, it } from 'vitest';

import { parseQueryParams, parseQueryParamsFromUrl } from './request-helpers';

describe('request-helpers', () => {
    describe('parseQueryParams', () => {
        it('should parse single values correctly', () => {
            const searchParams = new URLSearchParams('name=john&age=25');
            const result = parseQueryParams(searchParams);

            expect(result).toEqual({
                name: 'john',
                age: '25'
            });
        });

        it('should handle multiple values for the same key as an array', () => {
            const searchParams = new URLSearchParams('tags=javascript&tags=typescript&category=programming');
            const result = parseQueryParams(searchParams);

            expect(result).toEqual({
                tags: ['javascript', 'typescript'],
                category: 'programming'
            });
        });

        it('should handle empty search params', () => {
            const searchParams = new URLSearchParams('');
            const result = parseQueryParams(searchParams);

            expect(result).toEqual({});
        });

        it('should handle params with empty values', () => {
            const searchParams = new URLSearchParams('name=&active=true');
            const result = parseQueryParams(searchParams);

            expect(result).toEqual({
                name: '',
                active: 'true'
            });
        });
    });

    describe('parseQueryParamsFromUrl', () => {
        it('should parse query params from a full URL', () => {
            const url = 'https://api.example.com/users?name=john&age=25&tags=js&tags=ts';
            const result = parseQueryParamsFromUrl(url);

            expect(result).toEqual({
                name: 'john',
                age: '25',
                tags: ['js', 'ts']
            });
        });

        it('should handle URLs without query params', () => {
            const url = 'https://api.example.com/users';
            const result = parseQueryParamsFromUrl(url);

            expect(result).toEqual({});
        });

        it('should handle complex query parameters', () => {
            const url = 'https://api.example.com/posts?_embed=comments&_embed=author&_sort=createdAt&_order=desc&status=published&status=draft';
            const result = parseQueryParamsFromUrl(url);

            expect(result).toEqual({
                _embed: ['comments', 'author'],
                _sort: 'createdAt',
                _order: 'desc',
                status: ['published', 'draft']
            });
        });
    });
});
