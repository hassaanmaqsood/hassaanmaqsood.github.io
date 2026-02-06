// Article data will be loaded from markdown files
let articlesData = {};

// Parse front matter from markdown content
function parseFrontMatter(markdown) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdown.match(frontMatterRegex);

    if (!match) {
        return { metadata: {}, content: markdown };
    }

    const frontMatter = match[1];
    const content = match[2];

    // Parse YAML-like front matter
    const metadata = {};
    frontMatter.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            // Handle arrays (tags)
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
            }

            metadata[key] = value;
        }
    });

    return { metadata, content };
}

// Get first paragraph from markdown content for description
function getDescription(content) {
    // Remove front matter if present
    const withoutFrontMatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

    // Get first paragraph (before first heading or empty line)
    const firstParagraph = withoutFrontMatter
        .split(/\n\n|^#+\s/)[0]
        .trim()
        .replace(/[#*_`]/g, '') // Remove markdown formatting
        .substring(0, 150); // Limit length

    return firstParagraph + (firstParagraph.length >= 150 ? '...' : '');
}

// Create project card HTML
function createProjectCard(slug, data) {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.setAttribute('data-category', data.category || 'engineering');
    card.setAttribute('data-project', slug);

    const description = data.description || getDescription(data.content);

    card.innerHTML = `
        <div class="project-image">
            <img src="${data.image}" alt="${data.title}">
        </div>
        <div class="project-info">
            <div class="project-tags">
                ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <h3 class="project-title">${data.title}</h3>
            <p class="project-description">${description}</p>
        </div>
    `;

    // Add click handler
    card.addEventListener('click', () => {
        openModal(slug);
    });

    return card;
}

// Load all articles from markdown files
async function loadArticles() {
    // List of article files to load
    const articleFiles = articlesList || [];

    const projectsContainer = document.querySelector('.projects');

    for (const slug of articleFiles) {
        try {
            const response = await fetch(`./articles/${slug}.md`);
            if (response.ok) {
                const markdown = await response.text();
                const { metadata, content } = parseFrontMatter(markdown);

                articlesData[slug] = {
                    title: metadata.title || 'Untitled',
                    tags: metadata.tags || [],
                    meta: metadata.meta || metadata.category || 'Project',
                    image: metadata.image || './images/placeholder.png',
                    category: metadata.category || 'engineering',
                    description: metadata.description || '',
                    date: metadata.date || '',
                    content: content
                };

                // Create and append project card
                const card = createProjectCard(slug, articlesData[slug]);
                projectsContainer.appendChild(card);
            }
        } catch (error) {
            console.warn(`Failed to load article: ${slug}`, error);
        }
    }

    // If no articles loaded, populate cards from existing HTML or use fallback
    if (Object.keys(articlesData).length === 0) {
        console.warn('No markdown articles found, using fallback data');
        //populateFallbackData();
    }

    // Trigger animations for dynamically added cards
    requestAnimationFrame(() => {
        document.querySelectorAll('.project-card').forEach((card, index) => {
            card.style.animationDelay = `${0.1 + index * 0.05}s`;
        });
    });
}

function openModal(projectId) {
    const modal = document.getElementById('projectModal');
    const data = articlesData[projectId];

    if (data) {
        document.getElementById('modalTitle').textContent = data.title;
        document.getElementById('modalMeta').textContent = data.meta;
        document.getElementById('modalImage').innerHTML = `<img src="${data.image}" alt="${data.title}">`;
        document.getElementById('modalTags').innerHTML = data.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        document.getElementById('modalBody').innerHTML = marked.parse(data.content);
    }

    requestAnimationFrame(() => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
}

function closeModal() {
    const modal = document.getElementById('projectModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Load articles from markdown files and generate cards
    await loadArticles();

    // No need to set up click handlers here - they're added when cards are created
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

document.getElementById('projectModal').addEventListener('click', (e) => {
    if (e.target.id === 'projectModal') closeModal();
});

const filterBtns = document.querySelectorAll('.filter-btn');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        const projectCards = document.querySelectorAll('.project-card');

        projectCards.forEach(card => {
            if (filter === 'all' || card.dataset.category === filter) {
                card.style.display = 'block';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 10);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });
    });
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});