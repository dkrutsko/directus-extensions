// The demo of the Node Graph interface, display and hook: a collection whose items hold their graphs at four stages
// (finished, half built, just created, empty), a form with the graph fields in groups by topic, and a table which shows
// the display. A second collection holds the ovens which the nodes of the bakery line point at. The sandbox builds it
// from this file; how a definition works is in sandbox/README.md, "Demos".
//
// The rulesets are the JSON files beside this one and the approval workflow of ../examples, read as it is. The hook
// checks every graph seeded here: Ratchet and Reject refuse a new item with an error, so the graph with errors sits in
// a field set to Log only. A field's note names its ruleset rather than listing it, as a whole ruleset is far too long
// for a note.
import fs from 'node:fs';
import { collection, field, group, table } from '../../../sandbox/demo/define.mjs';

const read = (file) => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));

const OVENS = 'demo_node_graph_ovens';

/** A value of a Collection Item Dropdown: one of the ovens. */
const oven = (key) => ({ key, collection: OVENS });

/** The items of a repeater whose items have one field, `label`: the answers of a question, the branches of a condition. */
const labels = (...texts) => texts.map((label) => ({ label }));

/**
 * A stored graph. Nodes are `[id, type, x, y, data]`. Connections are `[from, to, type, data]`, with `from` and `to` as
 * `node.port`; the key of a dynamic output has a dot of its own (`n_card.answers.0`). The hook adds `meta` and the
 * stamp of the ruleset when it saves the graph.
 */
function graph(nodes, connections = []) {
	const end = (point) => [point.slice(0, point.indexOf('.')), point.slice(point.indexOf('.') + 1)];

	return {
		format: 'directus-node-graph',
		version: 1,
		nodes: nodes.map(([id, type, x, y, data = {}]) => ({ id, type, position: { x, y }, data })),
		edges: connections.map(([from, to, type, data = {}], index) => {
			const [source, sourceHandle] = end(from);
			const [target, targetHandle] = end(to);
			return { id: `e_${index + 1}`, type, source, sourceHandle, target, targetHandle, data };
		}),
	};
}

/** A copy of a graph with other data on one node. */
function changed(original, id, data) {
	const copy = structuredClone(original);
	copy.nodes.find((node) => node.id === id).data = data;
	return copy;
}

/**
 * A graph as a script might write it past the hook: without the format marker, and with numbers for ids. Every reader
 * repairs both and says so, and the editor's next Apply writes the repaired graph.
 */
function unmarked({ nodes, edges }) {
	const number = new Map(nodes.map((node, index) => [node.id, index + 1]));

	return {
		nodes: nodes.map((node) => ({ ...node, id: number.get(node.id) })),
		edges: edges.map((edge, index) => ({ ...edge, id: 101 + index, source: number.get(edge.source), target: number.get(edge.target) })),
	};
}

const stagesOf = (graphs, change) => Object.fromEntries(Object.entries(graphs).map(([stage, value]) => [stage, change(value)]));

// A small pipeline, top to bottom: ports carry dough, baked goods or packed goods.
const BAKERY = {
	ruleset: read('./bakery-line.json'),
	file: 'packages/node-graph/demo/bakery-line.json',
	graphs: {
		finished: graph(
			[
				['n_mix', 'mix', 0, 0, { product: 'sourdough', batch_kg: 40 }],
				['n_proof', 'proof', 0, 198, { minutes: 90 }],
				['n_bake', 'bake', 0, 342, { oven: oven(1), temperature: 230, minutes: 40 }],
				['n_pack', 'pack', 0, 576, { box: 'bags' }],
				['n_shop', 'dispatch', 0, 720, { destination: 'shop' }],
				['n_cafe', 'dispatch', 324, 576, { destination: 'cafe' }],
			],
			[
				['n_mix.out', 'n_proof.in', 'belt'],
				['n_proof.out', 'n_bake.in', 'belt'],
				['n_bake.out', 'n_pack.in', 'rack', { minutes: 45 }],
				['n_pack.out', 'n_shop.in', 'belt'],
				['n_bake.out', 'n_cafe.in', 'rack', { minutes: 30 }],
			],
		),
		draft: graph(
			[
				['n_mix', 'mix', 0, 0, { product: 'rye', batch_kg: 25 }],
				['n_proof', 'proof', 0, 198, { minutes: 45 }],
				['n_bake', 'bake', 324, 198, { temperature: 220, minutes: 35 }],
			],
			[['n_mix.out', 'n_proof.in', 'belt']],
		),
		// What Create seeds from the starter of the ruleset.
		started: graph(
			[
				['n_mix', 'mix', 0, 0, { batch_kg: 20 }],
				['n_bake', 'bake', 0, 198, { temperature: 220, minutes: 35 }],
				['n_dispatch', 'dispatch', 0, 432],
			],
			[
				['n_mix.out', 'n_bake.in', 'belt'],
				['n_bake.out', 'n_dispatch.in', 'rack', { minutes: 30 }],
			],
		),
	},
};

// A decision flow, left to right: each answer of a question is an output of its own.
const LOANS = {
	ruleset: read('./loan-desk.json'),
	file: 'packages/node-graph/demo/loan-desk.json',
	graphs: {
		// Columns 324 apart, so that the tree fills the canvas of the wide drawer at about half its size.
		finished: graph(
			[
				['n_desk', 'desk', 0, 162],
				['n_card', 'question', 324, 144, { question: 'Is the member’s card valid?', answers: labels('Yes', 'No') }],
				['n_kind', 'question', 648, 36, { question: 'What is it?', answers: labels('A reference book', 'A new arrival', 'Anything else') }],
				['n_renew', 'outcome', 648, 288, { decision: 'librarian', note: 'Renew the card first' }],
				['n_reading', 'outcome', 972, 0, { decision: 'reading_room' }],
				['n_week', 'outcome', 972, 126, { decision: 'one_week' }],
				['n_three', 'outcome', 972, 252, { decision: 'three_weeks' }],
			],
			[
				['n_desk.next', 'n_card.in', 'answer'],
				['n_card.answers.0', 'n_kind.in', 'answer'],
				['n_card.answers.1', 'n_renew.in', 'answer'],
				['n_kind.answers.0', 'n_reading.in', 'answer'],
				['n_kind.answers.1', 'n_week.in', 'answer'],
				['n_kind.answers.2', 'n_three.in', 'answer'],
			],
		),
		// The new question has no text yet, which this ruleset counts as a warning.
		draft: graph(
			[
				['n_desk', 'desk', 0, 108],
				['n_card', 'question', 324, 90, { question: 'Is the member’s card valid?', answers: labels('Yes', 'No') }],
				['n_three', 'outcome', 648, 0, { decision: 'three_weeks' }],
				['n_new', 'question', 648, 180, { answers: labels('Yes', 'No') }],
			],
			[
				['n_desk.next', 'n_card.in', 'answer'],
				['n_card.answers.0', 'n_three.in', 'answer'],
			],
		),
		started: graph(
			[
				['n_desk', 'desk', 0, 0],
				['n_first', 'question', 360, 0, { answers: labels('Yes', 'No') }],
			],
			[['n_desk.next', 'n_first.in', 'answer']],
		),
	},
};

const REQUEST = { title: 'Request received' };
const BUDGET = { title: 'Check the budget', assignee: 'team_lead', due_days: 2 };

// The example of the extension, which uses nearly every feature of a ruleset.
const APPROVAL = {
	ruleset: read('../examples/approval-workflow.json'),
	file: 'packages/node-graph/examples/approval-workflow.json',
	graphs: {
		// Columns 324 apart, as in the decision tree.
		finished: graph(
			[
				['n_start', 'start', 0, 252, REQUEST],
				['n_budget', 'task', 324, 198, BUDGET],
				['n_kind', 'condition', 648, 234, { label: 'What is it for?', branches: labels('Equipment', 'Travel') }],
				['n_manager', 'approval', 972, 36, { approver: 'manager', sla_hours: 48 }],
				['n_lead', 'approval', 972, 288, { approver: 'team_lead', sla_hours: 24 }],
				['n_cancelled', 'end', 972, 540, { outcome: 'cancelled' }],
				['n_notify', 'notify', 1296, 0, { channel: 'email', message: 'The request has waited two days for a manager.' }],
				['n_approved', 'end', 1296, 180, { outcome: 'approved' }],
				['n_rejected', 'end', 1296, 360, { outcome: 'rejected' }],
			],
			[
				['n_start.next', 'n_budget.in', 'flow'],
				['n_budget.next', 'n_kind.in', 'timeout', { after_hours: 48 }],
				['n_kind.branches.0', 'n_manager.in', 'flow'],
				['n_kind.branches.1', 'n_lead.in', 'flow'],
				['n_kind.else', 'n_cancelled.in', 'flow', { label: 'withdrawn' }],
				['n_manager.approved', 'n_approved.in', 'flow'],
				['n_manager.rejected', 'n_rejected.in', 'flow'],
				['n_manager.escalate', 'n_notify.trigger', 'flow'],
				['n_lead.approved', 'n_approved.in', 'flow'],
				['n_lead.rejected', 'n_rejected.in', 'flow'],
			],
		),
		draft: graph(
			[
				['n_start', 'start', 0, 36, REQUEST],
				['n_budget', 'task', 324, 0, BUDGET],
				['n_manager', 'approval', 648, 0, { approver: 'manager', sla_hours: 24 }],
				['n_approved', 'end', 972, 0, { outcome: 'approved' }],
				['n_notify', 'notify', 972, 216, { channel: 'email' }],
			],
			[
				['n_start.next', 'n_budget.in', 'flow'],
				['n_budget.next', 'n_manager.in', 'flow'],
				['n_manager.approved', 'n_approved.in', 'flow'],
			],
		),
		started: graph([
			['n_start', 'start', 0, 0],
			['n_end', 'end', 480, 0],
		]),
	},
};

/**
 * Four errors and a warning: a missing approver, an escalation (an event) into an End (control flow), a node whose
 * type the ruleset no longer has, a connection whose source node is gone, and a node of a deprecated type.
 */
const FAULTY = graph(
	[
		['n_start', 'start', 0, 216, REQUEST],
		['n_old', 'legacy_review', 324, 216, { title: 'Old budget check' }],
		['n_budget', 'task', 648, 180, BUDGET],
		['n_approval', 'approval', 972, 144, { sla_hours: 24 }],
		['n_approved', 'end', 1296, 0, { outcome: 'approved' }],
		['n_board', 'review_board', 1296, 198, { title: 'Review board' }],
		['n_rejected', 'end', 1296, 396, { outcome: 'rejected' }],
	],
	[
		['n_start.next', 'n_old.in', 'flow'],
		['n_old.next', 'n_budget.in', 'flow'],
		['n_budget.next', 'n_approval.in', 'flow'],
		['n_approval.approved', 'n_approved.in', 'flow'],
		['n_approval.rejected', 'n_board.in', 'flow'],
		['n_approval.escalate', 'n_rejected.in', 'flow'],
		['n_gone.next', 'n_approved.in', 'flow'],
	],
);

const LONG_TITLE =
	'Check the budget: the cost of the trip or the equipment against what is left of this year’s budget, ' +
	'the quotes attached to the request, and the rules of the club for spending';

/** Each graph field's value at each stage, filled in by `graphField`; a field without one is empty in every item. */
const values = new Map();

/** How a note names a ruleset: by its name, key and version, and the file it comes from. */
const named = ({ ruleset: { name, key, version }, file }) => `${name} (\`${key}\`, version ${version}) from \`${file}\``;

/**
 * A JSON field on the Node Graph interface, with the Node Graph Summary display. `set` is one of the rulesets above,
 * with its graphs, which `graphs` replaces where the field holds others; `options` are the other interface options.
 */
function graphField(key, name, { set, graphs = set?.graphs, options = {}, ...spec }) {
	values.set(key, graphs ?? null);

	return field(key, name, {
		type: 'json',
		interface: 'node-graph',
		display: 'node-graph-summary',
		options: set ? { ruleset: set.ruleset, ...options } : options,
		brief: set ? { ruleset: named(set) } : undefined,
		...spec,
	});
}

// The rulesets with every other option at its default.
const RECIPES = [
	graphField('production', 'Production line, top to bottom', {
		set: BAKERY,
		note:
			'A small pipeline. Its ports carry dough, baked goods or packed goods, and only matching ones connect: drag from Mix to Pack to see a refusal. ' +
			'Bake picks an oven from Node Graph, Ovens, and the card shows its name.',
	}),
	graphField('loan', 'Decision tree, left to right', {
		set: LOANS,
		note:
			'A decision flow. Each answer of a Question is an output of its own, and a connection may only start at the desk or at an answer. ' +
			'An empty required field is only a warning in this ruleset, so a half-written tree can be saved.',
	}),
	graphField('approval', 'Approval workflow, the example', {
		set: APPROVAL,
		note:
			'The ruleset which Load Example offers: tasks, approvals, a condition with an output for each of its branches, a notification on escalation ' +
			'and a timeout connection. Its palette has no Legacy review: that type is deprecated.',
	}),
];

// How problems are reported, and what the server does with them.
const ISSUES = [
	graphField('approval_issues', 'Errors kept, Log only', {
		set: APPROVAL,
		graphs: { finished: FAULTY, draft: changed(APPROVAL.graphs.draft, 'n_manager', { sla_hours: 24 }), started: APPROVAL.graphs.started },
		options: { enforcement: 'log' },
		note:
			'Saved with four errors and a warning, because the server only logs them: an Approval without an approver, an escalation into an End, ' +
			'a node whose type the ruleset no longer has, and a connection whose node is gone, which the editor lists but cannot draw. ' +
			'A click on an issue selects its element. Set Server Enforcement to Ratchet in the field’s settings ' +
			'and an edit which adds no error still saves; with Reject none does until every error is fixed.',
	}),
	graphField('production_reject', 'Reject', {
		set: BAKERY,
		options: { enforcement: 'reject' },
		note:
			'Any save of a graph with an error is refused, even of one the graph already had; Ratchet, the default, refuses only new ones. ' +
			'Clear the minutes of the Proof step, apply and save: the save is refused, and the form’s notice lists the issue.',
	}),
	graphField('production_off', 'Off, a value written past the server', {
		set: BAKERY,
		graphs: stagesOf(BAKERY.graphs, unmarked),
		options: { enforcement: 'off' },
		note:
			'The server does not check this field, and its values were stored as a script might write them: ' +
			'without the format marker and with numbers for ids. ' +
			'The row marks the value as repaired, its tooltip lists the repairs, and Apply in the editor writes the repaired graph.',
	}),
];

// The editor drawer.
const EDITOR = [
	graphField('approval_full', 'Full width, with a minimap', {
		set: APPROVAL,
		options: { editorWidth: 'full', showMinimap: true },
		note: 'The editor takes the whole window, and a minimap sits in the bottom right corner of the canvas.',
	}),
	graphField('production_standard', 'Standard width, coarse grid', {
		set: BAKERY,
		options: { editorWidth: 'standard', gridSize: 36 },
		note: 'The drawer is as wide as the other drawers of Directus, so the fields and issues move under the canvas. Nodes snap to a grid of 36.',
	}),
	graphField('loan_free', 'No snapping', {
		set: LOANS,
		options: { snapToGrid: false },
		note: 'Nodes stay where they are dropped, and the arrow keys move a selected node by 1 px, or 10 px with Shift.',
	}),
];

// The text of the row and of the display.
const TEXT = [
	graphField('production_summary', 'Own summary', {
		set: BAKERY,
		options: { template: '{{ruleset.name}} v{{ruleset.version}} · Bakes: {{counts.bake}} · Warnings: {{warningCount}}' },
		note: 'The row and the table show this text instead of the counts. A template has no plural forms, so this one puts its labels before the numbers.',
	}),
	graphField('loan_placeholder', 'Own placeholder', {
		set: LOANS,
		graphs: null,
		options: { placeholder: 'No decision tree yet' },
		note: 'Empty in every item, so the row shows its placeholder. Create starts the tree from the starter of the ruleset.',
	}),
];

const STATES = [
	graphField('approval_readonly', 'Read-only', {
		set: APPROVAL,
		graphs: { ...APPROVAL.graphs, finished: changed(APPROVAL.graphs.finished, 'n_budget', { ...BUDGET, title: LONG_TITLE }) },
		readonly: true,
		note:
			'The row offers View instead of Edit, and the editor opens read-only, as for a user without update permission. ' +
			'The title of the Task is longer than its card: the card and the inspector shorten it, and the Title field of the inspector shows all of it.',
	}),
	graphField('no_ruleset', 'No ruleset yet', {
		note: 'What a new Node Graph field shows until a ruleset is set. Open its settings and click Load Example to try the ruleset editor.',
		options: {},
	}),
];

// How far the graphs of each item have come: the key of each set's graphs, or none.
const STAGES = [
	['Finished', 'finished'],
	['Half built', 'draft'],
	['Just created', 'started'],
	['Empty', null],
];

const valuesAt = (stage) => Object.fromEntries([...values].map(([key, graphs]) => [key, (stage && graphs?.[stage]) || null]));

// The notices at the top of the groups.
const RECIPES_TEXT =
	'Three rulesets, with every other option at its default. They are JSON files in `packages/node-graph/demo` and `packages/node-graph/examples`: ' +
	'paste one into **Edit as JSON** in the settings of a field of your own to start from it.';

const ISSUES_TEXT =
	'The editor checks a graph while you draw and lists what is still wrong. ' +
	'The server checks it when the item is saved, as **Server Enforcement** says. Warnings never refuse a save.';

const demo = collection('demo_node_graph', {
	name: 'Node Graph',
	icon: 'account_tree',
	note: 'The Node Graph interface, display and hook, in a form and in the table',
	template: '{{name}}',
	about:
		'**Node Graph** keeps a graph of nodes and connections in a JSON field. ' +
		'The form shows a row with its counts, and a click opens the editor in a wide drawer: ' +
		'the node types on the left, the graph in the middle, the selected node’s fields and the issues on the right. ' +
		'A **ruleset** in the field’s options says what a graph may hold; the editor checks it while you draw, and the server when the item is saved. ' +
		'The **Node Graph Summary** display shows the row’s text in the table. The items differ only in how far their graphs have come.',

	fields: [
		field('name', 'Item', { interface: 'input', describe: false, note: 'How far the graphs of this item have come.' }),
		group('recipes', 'Recipes', { open: true, icon: 'menu_book', text: RECIPES_TEXT }, RECIPES),
		group('issues', 'Issues and the server', { icon: 'report', text: ISSUES_TEXT }, ISSUES),
		group('editor', 'The editor', { icon: 'open_in_full' }, EDITOR),
		group('text', 'Text', { icon: 'text_fields' }, TEXT),
		group('states', 'Read-only and empty', { icon: 'lock' }, STATES),
	],

	items: STAGES.map(([name, stage]) => ({ name, ...valuesAt(stage) })),

	presets: [
		table(['name', 'production', 'loan', 'approval', 'approval_issues', 'production_summary'], {
			widths: { name: 130, production: 180, loan: 180, approval: 190, approval_issues: 200, production_summary: 320 },
		}),
	],
});

// Shown under the demo which uses it, in the navigation, rather than beside it.
const ovens = collection(OVENS, {
	name: 'Ovens',
	icon: 'local_fire_department',
	note: 'The ovens which the Bake steps of the Node Graph demo point at',
	supports: demo.collection,
	template: '{{name}}',
	about:
		'**Ovens** are the items which a Bake step of the bakery line picks with a Collection Item Dropdown inside the node. ' +
		'The editor shows their names on the cards and in the inspector; the server and the table know only their keys. ' +
		'Rename an oven here and open a graph again: its cards follow.',
	fields: [field('name', 'Oven', { interface: 'input', describe: false, note: 'The name the cards show.' })],
	items: [
		{ id: 1, name: 'Deck oven' },
		{ id: 2, name: 'Rack oven' },
		{ id: 3, name: 'Wood-fired oven' },
	],
});

export default [demo, ovens];
