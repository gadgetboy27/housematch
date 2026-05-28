#!/usr/bin/env node

/**
 * Extract Sentry Dashboard URL from DSN
 * 
 * This script extracts your Sentry project ID from the DSN
 * and generates the dashboard URL for easy access.
 */

const dsn = process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN;

if (!dsn) {
  console.error('❌ No Sentry DSN found in environment variables');
  console.error('   Make sure SENTRY_DSN or VITE_SENTRY_DSN is set');
  process.exit(1);
}

try {
  // Parse the DSN to extract project ID
  // DSN format: https://PUBLIC_KEY@HOST/PROJECT_ID
  const url = new URL(dsn);
  const projectId = url.pathname.substring(1); // Remove leading '/'

  if (!projectId) {
    throw new Error('Could not extract project ID from DSN');
  }

  // Generate dashboard URLs
  const issuesUrl = `https://sentry.io/issues/?project=${projectId}`;
  const projectUrl = `https://sentry.io/projects/${projectId}/`;

  console.log('\n📊 Sentry Dashboard Links:');
  console.log('═'.repeat(60));
  console.log(`\n🔍 Issues Dashboard:`);
  console.log(`   ${issuesUrl}`);
  console.log(`\n📁 Project Dashboard:`);
  console.log(`   ${projectUrl}`);
  console.log(`\n💡 General Sentry Dashboard:`);
  console.log(`   https://sentry.io/`);
  console.log('\n' + '═'.repeat(60));
  console.log(`\n✅ Project ID: ${projectId}\n`);

} catch (error) {
  console.error('❌ Error parsing Sentry DSN:', error.message);
  console.error('   Please check your DSN format');
  process.exit(1);
}
