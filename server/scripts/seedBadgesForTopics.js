import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Topic from '../models/Topic.js';
import Badge from '../models/Badge.js';

dotenv.config({ path: '../.env' });

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function simpleIcon(slug, color = '4f46e5') {
  // color without #; default indigo-600
  return `https://cdn.simpleicons.org/${slug}/${color}`;
}

function getBadgeMeta(title, fallbackTemplate) {
  const t = String(title || '').toLowerCase();
  const slug = slugify(title);
  // Defaults
  let name = `${title} Badge`;
  let description = `Completed learning milestone in ${title}.`;
  let imageUrl = fallbackTemplate.replace('{slug}', encodeURIComponent(slug));

  // Language topics
  if (t.includes('c++')) {
    name = 'C++ Grandmaster';
    description = 'Mastered C++ fundamentals, OOP, STL, templates, and memory management.';
    imageUrl = simpleIcon('cplusplus');
  } else if (t === 'c' || t.startsWith('c ')) {
    name = 'C Language Pro';
    description = 'Demonstrated proficiency in C syntax, pointers, memory, and system-level concepts.';
    imageUrl = simpleIcon('c');
  } else if (t.includes('python')) {
    name = 'Python Artisan';
    description = 'Skilled in Python essentials, data structures, and scripting best practices.';
    imageUrl = simpleIcon('python');
  } else if (t.includes('javascript')) {
    name = 'JavaScript Maestro';
    description = 'Strong command over JS fundamentals, ES6+, and asynchronous programming.';
    imageUrl = simpleIcon('javascript');
  } else if (t === 'html' || t.includes('html5')) {
    name = 'HTML5 Specialist';
    description = 'Expertise in semantic HTML, accessibility, and modern web structure.';
    imageUrl = simpleIcon('html5');
  } else if (t === 'css' || t.includes('css3')) {
    name = 'CSS3 Stylist';
    description = 'Fluent in responsive layouts, Flexbox/Grid, and modern CSS techniques.';
    imageUrl = simpleIcon('css3');
  }

  // DSA topics
  else if (t.includes('array')) {
    name = 'Array Ace';
    description = 'Efficient solutions using arrays, two-pointers, and in-place techniques.';
  } else if (t.includes('string')) {
    name = 'String Savant';
    description = 'Proficient with string manipulation, hashing, and pattern techniques.';
  } else if (t.includes('binary search')) {
    name = 'Binary Search Ninja';
    description = 'Expert at binary search on arrays, answers, and monotonic predicates.';
  } else if (t.includes('sliding window')) {
    name = 'Sliding Window Virtuoso';
    description = 'Mastered dynamic windowing for optimal subarray and substring problems.';
  } else if (t.includes('dynamic programming')) {
    name = 'DP Pathfinder';
    description = 'Skilled at state modeling, transitions, and optimization in DP problems.';
  } else if (t.includes('hash table') || t.includes('hashtable') || t.includes('hashmap')) {
    name = 'Hash Table Strategist';
    description = 'Applied hashing for fast lookup, frequency maps, and collision reasoning.';
  }

  return { name, description, imageUrl };
}

async function main() {
  try {
    await connectDB();

    const topics = await Topic.find({}).lean();
    if (!topics.length) {
      console.log('No topics found. Please create topics first.');
      process.exit(0);
    }

    // Template for fallback image URL, replace {slug}
    const template = process.env.BADGE_IMAGE_TEMPLATE || 'https://api.dicebear.com/7.x/shapes/svg?seed={slug}';

    let created = 0;
    let updated = 0;

    for (const t of topics) {
      const { name, description, imageUrl } = getBadgeMeta(t.title, template);

      // Upsert badge by topic so each topic has exactly one badge
      const existing = await Badge.findOne({ topic: t._id });
      if (existing) {
        // Update name/image if changed
        if (existing.name !== name || existing.imageUrl !== imageUrl || existing.description !== description) {
          existing.name = name;
          existing.imageUrl = imageUrl;
          existing.description = description;
          await existing.save();
          updated += 1;
          console.log(`🔄 Updated badge for topic: ${t.title}`);
        } else {
          console.log(`✔️  Badge already up-to-date for topic: ${t.title}`);
        }
        continue;
      }

      await Badge.create({ name, imageUrl, description, topic: t._id });
      created += 1;
      console.log(`🏷️  Created badge for topic: ${t.title}`);
    }

    console.log(`\nDone. Created: ${created}, Updated: ${updated}, Total topics: ${topics.length}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed badges error:', err);
    process.exit(1);
  }
}

main();
