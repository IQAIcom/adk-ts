/**
 * Agent Evaluation Framework Example
 * 
 * This example demonstrates how to use the ADK evaluation framework
 * to systematically test agent performance across different scenarios.
 */

import { AgentEvaluator } from '@iqai/adk/evaluation';
import { LlmAgent, AgentBuilder } from '@iqai/adk';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// Create test directory structure
async function setupTestFiles() {
  const testDir = join(process.cwd(), 'eval-tests');
  await mkdir(testDir, { recursive: true });

  // Basic calculation test
  const basicTest = {
    evalset_name: 'basic_calculations',
    eval_cases: [
      {
        eval_id: 'calc_001',
        user_content: {
          parts: [{ text: 'What is 15 + 27?' }]
        },
        expected_response: {
          parts: [{ text: 'The answer is 42.' }]
        }
      },
      {
        eval_id: 'calc_002',
        user_content: {
          parts: [{ text: 'Calculate 8 * 9' }]
        },
        expected_response: {
          parts: [{ text: '8 * 9 = 72' }]
        }
      }
    ]
  };

  // Multi-turn conversation test
  const conversationTest = {
    evalset_name: 'conversation_flow',
    eval_cases: [
      {
        eval_id: 'conv_001',
        conversation_history: [
          {
            role: 'user',
            content: { parts: [{ text: 'Hi, I need help with math' }] }
          },
          {
            role: 'model',
            content: { parts: [{ text: 'I\'d be happy to help you with math! What problem would you like to work on?' }] }
          }
        ],
        user_content: {
          parts: [{ text: 'What is 25% of 200?' }]
        },
        expected_response: {
          parts: [{ text: '25% of 200 is 50.' }]
        }
      }
    ]
  };

  // Test configuration
  const testConfig = {
    eval_metrics: [
      {
        metric_name: 'RESPONSE_MATCH_SCORE',
        threshold: 0.7
      },
      {
        metric_name: 'RESPONSE_EVALUATION_SCORE',
        threshold: 4.0,
        judge_model: 'gpt-4'
      }
    ]
  };

  // Write test files
  await writeFile(
    join(testDir, 'basic.test.json'),
    JSON.stringify(basicTest, null, 2)
  );

  await writeFile(
    join(testDir, 'conversation.test.json'),
    JSON.stringify(conversationTest, null, 2)
  );

  await writeFile(
    join(testDir, 'test_config.json'),
    JSON.stringify(testConfig, null, 2)
  );

  return testDir;
}

async function runEvaluationExample() {
  try {
    console.log('🚀 Setting up evaluation framework example...\n');

    // Create agent for testing
    const agent = new AgentBuilder()
      .withName('math-assistant')
      .withModel('gpt-4')
      .withInstruction('You are a helpful math tutor. Provide clear, accurate answers to mathematical questions.')
      .buildLlm();

    // Setup test files
    const testDir = await setupTestFiles();
    console.log(`✅ Created test files in: ${testDir}\n`);

    // Run single test file evaluation
    console.log('📋 Running evaluation on basic calculations...');
    const basicResults = await AgentEvaluator.evaluate({
      agent,
      testFilePaths: [join(testDir, 'basic.test.json')],
      testConfigFilePath: join(testDir, 'test_config.json'),
      numRuns: 2 // Run twice for reliability
    });

    console.log('📊 Basic Test Results:');
    console.log(`   Overall Score: ${basicResults.overallScore.toFixed(3)}`);
    console.log(`   Tests Passed: ${basicResults.passedTests}/${basicResults.totalTests}`);
    console.log(`   Success Rate: ${(basicResults.passedTests / basicResults.totalTests * 100).toFixed(1)}%\n`);

    // Display detailed results
    if (basicResults.testResults.length > 0) {
      console.log('📝 Detailed Test Results:');
      for (const testResult of basicResults.testResults) {
        console.log(`   ${testResult.testName}: ${testResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
        if (!testResult.passed && testResult.failures.length > 0) {
          console.log(`      Failures: ${testResult.failures.join(', ')}`);
        }
      }
      console.log();
    }

    // Run directory-based evaluation (all test files)
    console.log('📁 Running evaluation on all test files in directory...');
    const allResults = await AgentEvaluator.evaluate({
      agent,
      testFilePaths: [testDir],
      testConfigFilePath: join(testDir, 'test_config.json'),
      numRuns: 1
    });

    console.log('📊 Complete Evaluation Results:');
    console.log(`   Overall Score: ${allResults.overallScore.toFixed(3)}`);
    console.log(`   Tests Passed: ${allResults.passedTests}/${allResults.totalTests}`);
    console.log(`   Success Rate: ${(allResults.passedTests / allResults.totalTests * 100).toFixed(1)}%\n`);

    // Show metric breakdown
    console.log('📈 Metric Breakdown:');
    for (const testResult of allResults.testResults) {
      console.log(`\n   Test: ${testResult.testName}`);
      if (testResult.metricScores) {
        for (const [metric, score] of Object.entries(testResult.metricScores)) {
          console.log(`     ${metric}: ${score.toFixed(3)}`);
        }
      }
    }

    console.log('\n✨ Evaluation completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('   - Add more test cases to improve coverage');
    console.log('   - Experiment with different evaluation metrics');
    console.log('   - Integrate evaluations into your development workflow');
    console.log('   - Create custom evaluators for domain-specific needs');

  } catch (error) {
    console.error('❌ Evaluation failed:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the example
if (import.meta.main) {
  runEvaluationExample();
}

export { runEvaluationExample };