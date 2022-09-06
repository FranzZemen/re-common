import 'mocha';
import {ExecutionContextI} from '@franzzemen/app-utility';
import chai from 'chai';
import {HasRefName, InferenceStackParser} from '../../publish/index.js';

const expect = chai.expect;
const should = chai.should();

const unreachableCode = false;

describe('re tests', () => {
  describe('re-common tests', () => {
    describe('inference-stack-parser tests', () => {
      // Placeholder 'parser' for testing purposes
      class Parser implements HasRefName {
        id: number;
        constructor( public refName: string) {

        }
      }
      // Test class to test aba\stract base class functionality
      class TestInferenceStackParser extends InferenceStackParser<Parser> {
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
        inferenceStack.addParser(new Parser('A'));
        inferenceStack.getInferenceStack().length.should.equal(1);
        inferenceStack.getInferenceStack()[0].should.equal('A');
        inferenceStack.addParser(new Parser('B'));
        inferenceStack.getInferenceStack().length.should.equal(2);
        inferenceStack.getInferenceStack()[0].should.equal('A');
        inferenceStack.getInferenceStack()[1].should.equal('B');
        inferenceStack.hasParser('A');
        inferenceStack.hasParser('B');
        done();
      })
      it('should add & replace a parser on override', done => {
        const inferenceStack = new TestInferenceStackParser();
        const a1 = new Parser('A');
        a1.id = 1;
        const a2 = new Parser('A');
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
        inferenceStack.addParser(new Parser('A'));
        inferenceStack.addParserAtStackIndex(new Parser('B'),0);
        inferenceStack.getInferenceStack().length.should.equal(2);
        inferenceStack.getInferenceStack()[0].should.equal('B');
        inferenceStack.getInferenceStack()[1].should.equal('A');
        inferenceStack.getParser('A').should.exist;
        inferenceStack.getParser('B').should.exist;

        inferenceStack.addParserAtStackIndex(new Parser('C'), 1);
        inferenceStack.getInferenceStack().length.should.equal(3);
        inferenceStack.getInferenceStack()[0].should.equal('B');
        inferenceStack.getInferenceStack()[1].should.equal('C');
        inferenceStack.getInferenceStack()[2].should.equal('A');

        inferenceStack.addParserAtStackIndex(new Parser('D'), 3);
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
        inferenceStack.addParser(new Parser('A'));
        inferenceStack.addParser(new Parser('B'));
        inferenceStack.addParser(new Parser('C'));
        inferenceStack.addParser(new Parser('D'));
        inferenceStack.addParser(new Parser('E'));

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
    })
  })
})
