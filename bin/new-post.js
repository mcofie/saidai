#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const POSTS_DIR = path.join(__dirname, '../content/posts');

// Ensure posts directory exists
if (!fs.existsSync(POSTS_DIR)) {
    console.error(`Error: Content directory not found at ${POSTS_DIR}`);
    process.exit(1);
}

const askQuestion = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
};

const quoteYaml = value => JSON.stringify(value);

const createPost = async () => {
    console.log('--- Create New Post ---');

    const title = await askQuestion('Post Title: ');
    if (!title) {
        console.error('Title is required!');
        rl.close();
        return;
    }

    const description = await askQuestion('Description (optional): ');

    // Default to 'Thought' if empty, or allow user input
    let category = await askQuestion('Category (default: Thought): ');
    if (!category) category = 'Thought';

    // Generate Slug
    const slug = title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s-]/gu, '') // Remove punctuation while preserving international letters
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/-+/g, '-')      // Remove duplicate dashes
        .replace(/^-+|-+$/g, ''); // Trim dashes

    if (!slug) {
        console.error('Error: Title must contain at least one letter or number to create a URL slug.');
        rl.close();
        return;
    }

    const filename = `${slug}.md`;
    const filePath = path.join(POSTS_DIR, filename);

    if (fs.existsSync(filePath)) {
        console.error(`Error: Post already exists at ${filePath}`);
        rl.close();
        return;
    }

    // Date Formats
    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateStr = `${months[now.getMonth()]} ${now.getFullYear()}`; // "Jan 2026"
    const isoDate = now.toISOString().split('T')[0]; // "2026-01-04"

    const content = `---
title: ${quoteYaml(title)}
date: ${quoteYaml(dateStr)}
isoDate: ${quoteYaml(isoDate)}
description: ${quoteYaml(description)}
category: ${quoteYaml(category)}
---

Write your content here...
`;

    fs.writeFileSync(filePath, content);
    console.log(`\n✅ Post created successfully:`);
    console.log(`   ${filePath}`);

    rl.close();
};

createPost();
