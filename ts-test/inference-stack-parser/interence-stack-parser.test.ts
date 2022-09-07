import {ExecutionContextI, ModuleResolution} from '@franzzemen/app-utility';
import chai from 'chai';
import 'mocha';
import Validator from 'fastest-validator';
import {InferenceStackParser, RuleElementModuleReference} from '../../publish/index.js';
import {TestParser} from './test-parser.js';

const expect = chai.expect;
const should = chai.should();

const unreachableCode = false;

describe('re tests', () => {
  describe('re-common tests', () => {
    describe('inference-stack-parser tests', () => {
      // Test class to test aba\stract base class functionality
      class TestInferenceStackParser extends InferenceStackParser<TestParser> {
        // We're not actually testing parsing so leave as is.
        parse(remaining: string, scope: Map<string, any>, inferredContext: any, execContext: ExecutionContextI | undefined): [string, any] {
          return ['', undefined];
        }

      }
      it ('should except on ordering an empty inference stack', done => {
        const inferenceStack = new TestInferenceStackParser();
        try {
          inferenceStack.orderInferenceStack(['A', 'B', 'C']);
          unreachableCode.should.be.true;
        } catch (e) {
        }
        finally {
          done();
        }
      })
      it('should add a parser', done => {
        const inferenceStack = new TestInferenceStackParser();
        inferenceStack.addParser(new TestParser('A'));
        inferenceStack.getInferenceStack().length.should.equal(1);
        inferenceStack.getInferenceStack()[0].should.equal('A');
        inferenceStack.addParser(new TestParser('B'));
        inferenceStack.getInferenceStack().length.should.equal(2);
        inferenceStack.getInferenceStack()[0].should.equal('A');
        inferenceStack.getInferenceStack()[1].should.equal('B');
        inferenceStack.hasParser('A');
        inferenceStack.hasParser('B');
        done();
      })
      it('should add & replace a parser on override', done => {
        const inferenceStack = new TestInferenceStackParser();
        const a1 = new TestParser('A');
        a1.id = 1;
        const a2 = new TestParser('A');
        a2.id = 2;
        inferenceStack.addParser(a1);
        inferenceStack.addParser(a2, true);
        inferenceStack.getInferenceStack().length.should.equal(1);
        inferenceStack.getInferenceStack()[0].should.equal('A');
        inferenceStack.getParser('A').id.should.equal(2);
        done();
      })
      it('should add a parser at position 0, middle, end', done => {
        const inferenceStack = new TestInferenceStackParser();
        inferenceStack.addParser(new TestParser('A'));
        inferenceStack.addParserAtStackIndex(new TestParser('B'),0);
        inferenceStack.getInferenceStack().length.should.equal(2);
        inferenceStack.getInferenceStack()[0].should.equal('B');
        inferenceStack.getInferenceStack()[1].should.equal('A');
        inferenceStack.getParser('A').should.exist;
        inferenceStack.getParser('B').should.exist;

        inferenceStack.addParserAtStackIndex(new TestParser('C'), 1);
        inferenceStack.getInferenceStack().length.should.equal(3);
        inferenceStack.getInferenceStack()[0].should.equal('B');
        inferenceStack.getInferenceStack()[1].should.equal('C');
        inferenceStack.getInferenceStack()[2].should.equal('A');

        inferenceStack.addParserAtStackIndex(new TestParser('D'), 3);
        inferenceStack.getInferenceStack().length.should.equal(4);
        inferenceStack.getInferenceStack()[0].should.equal('B');
        inferenceStack.getInferenceStack()[1].should.equal('C');
        inferenceStack.getInferenceStack()[2].should.equal('A');
        inferenceStack.getInferenceStack()[3].should.equal('D');

        // Check at least one has been added
        inferenceStack.getParser('D').should.exist;
        done();
      })
      it('should remove a parser at start, end, middle, all, non-existant', done => {
        const inferenceStack = new TestInferenceStackParser();
        inferenceStack.addParser(new TestParser('A'));
        inferenceStack.addParser(new TestParser('B'));
        inferenceStack.addParser(new TestParser('C'));
        inferenceStack.addParser(new TestParser('D'));
        inferenceStack.addParser(new TestParser('E'));

        inferenceStack.removeParser('A');
        inferenceStack.getInferenceStack().length.should.equal(4);
        inferenceStack.getInferenceStack()[0].should.equal('B');
        inferenceStack.getInferenceStack()[3].should.equal('E');

        inferenceStack.removeParser('E');
        inferenceStack.getInferenceStack().length.should.equal(3);
        inferenceStack.getInferenceStack()[0].should.equal('B');
        inferenceStack.getInferenceStack()[2].should.equal('D');

        inferenceStack.removeParser('C');
        inferenceStack.getInferenceStack().length.should.equal(2);
        inferenceStack.getInferenceStack()[0].should.equal('B');
        inferenceStack.getInferenceStack()[1].should.equal('D');

        inferenceStack.removeParser('B');
        inferenceStack.removeParser('D');
        inferenceStack.getInferenceStack().length.should.equal(0);

        inferenceStack.removeParser('A');
        inferenceStack.getInferenceStack().length.should.equal(0);
        done();
      })
      it('should load an parser with a Load Schema success', () => {
        const inferenceStack = new TestInferenceStackParser();
        const moduleRef: RuleElementModuleReference = {
          refName: 'CustomStackParser',
          module: {
            moduleName: '../../../testing/inference-stack-parser/custom-parser.cjs',
            constructorName: 'CustomParser',
            moduleResolution: ModuleResolution.commonjs,
            loadSchema: {
              useNewCheckerFunction: true,
              validationSchema: {
                refName: {type: 'string'},
                parse: {type: 'function'}
              }
            }
          }
        }
        const parser = inferenceStack.addParser(moduleRef);
        parser.should.exist;
        parser['refName'].should.equal('CustomParser1');
      })
      it('should not load an parser with a Load Schema fail', () => {
        const inferenceStack = new TestInferenceStackParser();
        const moduleRef: RuleElementModuleReference = {
          refName: 'CustomStackParser',
          module: {
            moduleName: '../../../testing/inference-stack-parser/custom-parser.cjs',
            constructorName: 'CustomParser',
            moduleResolution: ModuleResolution.commonjs,
            loadSchema: {
              useNewCheckerFunction: true,
              validationSchema: {
                refName: {type: 'number'},
                parse: {type: 'function'}
              }
            }
          }
        }
        try {
          const parser = inferenceStack.addParser(moduleRef);
        } catch (err) {
          err.message.startsWith('Sync validation failed').should.be.true;
        }
      })
      it('should load an parser with a checker success, ignoring schema', () => {
        const inferenceStack = new TestInferenceStackParser();
        const moduleRef: RuleElementModuleReference = {
          refName: 'CustomStackParser',
          module: {
            moduleName: '../../../testing/inference-stack-parser/custom-parser.cjs',
            constructorName: 'CustomParser',
            moduleResolution: ModuleResolution.commonjs,
            loadSchema: {
              useNewCheckerFunction: true,
              validationSchema: {
                refName: {type: 'number'},
                parse: {type: 'function'}
              }
            }
          }
        }
        const check = (new Validator()).compile({
            refName: {type: 'string'},
            parse: {type: 'function'}
          });
        const parser = inferenceStack.addParser(moduleRef,false,check);
        parser.should.exist;
        parser['refName'].should.equal('CustomParser1');
      })
      it('should not load an parser with a checker failure, ignoring schema', () => {
        const inferenceStack = new TestInferenceStackParser();
        const moduleRef: RuleElementModuleReference = {
          refName: 'CustomStackParser',
          module: {
            moduleName: '../../../testing/inference-stack-parser/custom-parser.cjs',
            constructorName: 'CustomParser',
            moduleResolution: ModuleResolution.commonjs,
            loadSchema: {
              useNewCheckerFunction: true,
              validationSchema: {
                refName: {type: 'string'},
                parse: {type: 'function'}
              }
            }
          }
        }
        const check = (new Validator()).compile({
          refName: {type: 'number'},
          parse: {type: 'function'}
        });
        try {
          const parser = inferenceStack.addParser(moduleRef);
        } catch (err) {
          err.message.startsWith('Sync validation failed').should.be.true;
        }
      })
    })
  })
})
