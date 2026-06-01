#!/usr/bin/env python3
"""
Generate sitemap.md, nav consistency report, and gallery inventory CSV
for the Neuroforge site.

Usage:
  python tools/generate_site_reports.py --root D:/0___TESTZONE/_theneurofoundry

Outputs written to the project root:
  - sitemap.md
  - nav_report.md
  - gallery_inventory.csv
"""
import argparse
import os
import re
import csv
from pathlib import Path

try:
    from PIL import Image
except Exception:
    Image = None

TITLE_RE = re.compile(r'<title[^>]*>(.*?)</title>', re.IGNORECASE | re.DOTALL)
NAV_RE = re.compile(r'<nav\b', re.IGNORECASE)


def extract_title_and_nav(path):
    text = ''
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
    except Exception:
        return ('', False)
    m = TITLE_RE.search(text)
    title = m.group(1).strip() if m else ''
    has_nav = bool(NAV_RE.search(text))
    return (title, has_nav)


def gather_html(root):
    html_files = []
    for dirpath, dirs, files in os.walk(root):
        for fn in files:
            if fn.lower().endswith('.html') or fn.lower().endswith('.htm'):
                html_files.append(os.path.join(dirpath, fn))
    html_files.sort()
    return html_files


def gather_images(root):
    exts = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'}
    imgs = []
    for dirpath, dirs, files in os.walk(root):
        for fn in files:
            if Path(fn).suffix.lower() in exts:
                imgs.append(os.path.join(dirpath, fn))
    imgs.sort()
    return imgs


def write_sitemap(root, html_files, out_path):
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('# Sitemap\n\n')
        for p in html_files:
            rel = os.path.relpath(p, root).replace('\\', '/')
            title, _ = extract_title_and_nav(p)
            line = f'- [{title or rel}]({rel})\n'
            f.write(line)


def write_nav_report(root, html_files, out_path):
    missing = []
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('# Navigation Consistency Report\n\n')
        f.write('Pages lacking a `<nav>` element (possible missing main nav):\n\n')
        for p in html_files:
            title, has_nav = extract_title_and_nav(p)
            rel = os.path.relpath(p, root).replace('\\', '/')
            if not has_nav:
                missing.append((rel, title))
                f.write(f'- {rel}  — {title or "(no title)"}\n')
        if not missing:
            f.write('\nAll pages contain a `<nav>` token. (This is a heuristic check.)\n')


def write_gallery_csv(root, images, out_path):
    header = ['path','size_bytes','width','height','caption','tags']
    with open(out_path, 'w', encoding='utf-8', newline='') as csvf:
        writer = csv.writer(csvf)
        writer.writerow(header)
        for p in images:
            rel = os.path.relpath(p, root).replace('\\', '/')
            try:
                size = os.path.getsize(p)
            except Exception:
                size = ''
            w = h = ''
            if Image is not None and p.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                try:
                    with Image.open(p) as im:
                        w, h = im.size
                except Exception:
                    w = h = ''
            # Generate a simple caption and tags from the filename and path
            def make_caption(path_rel):
                name = Path(path_rel).stem
                # replace separators with spaces, collapse multiple spaces
                s = re.sub(r'[_\-]+', ' ', name)
                s = re.sub(r'\s+', ' ', s).strip()
                return s.title()

            def make_tags(path_rel):
                name = Path(path_rel).stem
                parts = re.split(r'[^A-Za-z0-9]+', name.lower())
                parts = [p for p in parts if p and len(p) > 1]
                # include parent folder names as tags
                parents = [p.lower() for p in Path(path_rel).parts[:-1] if p]
                tags = []
                for p in parents + parts:
                    if p and p not in tags:
                        tags.append(p)
                    if len(tags) >= 8:
                        break
                return ','.join(tags)

            caption = make_caption(rel)
            tags = make_tags(rel)
            writer.writerow([rel, size, w, h, caption, tags])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default=r'D:/0___TESTZONE/_theneurofoundry')
    args = parser.parse_args()
    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print('Root not found:', root)
        return

    html_files = gather_html(root)
    images = gather_images(root)

    sitemap_path = os.path.join(root, 'sitemap.md')
    nav_report_path = os.path.join(root, 'nav_report.md')
    gallery_csv_path = os.path.join(root, 'gallery_inventory.csv')

    write_sitemap(root, html_files, sitemap_path)
    write_nav_report(root, html_files, nav_report_path)
    write_gallery_csv(root, images, gallery_csv_path)

    print('Wrote:', sitemap_path)
    print('Wrote:', nav_report_path)
    print('Wrote:', gallery_csv_path)


if __name__ == '__main__':
    main()
