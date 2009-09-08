$.sameDay = function (date1, date2) {
	return date1.getDate() == date2.getDate() && date1.getMonth() == date2.getMonth() && date1.getFullYear() == date2.getFullYear();
};

$.prefixLeadingZeroes = function (number, digits) {
	var length, ZEROES = '000000000000000000000000000000000000000000000000000000';
	
	if (!digits)
		digits = 2;
	
	length = (number + '').length;
	
	if (length < digits)
		return ZEROES.substr(0, digits - length) + number;
	else
		return number;
};

$.addGanttColumn = function (date, headers, rows, data) {
	var index, current, className, cell;
	
	headers.push((date.getMonth() + 1) + '/' + date.getDate());
	
	for (index in data) {
		current = data[index];
		
		cell = $(document.createElement('td'));
		
		if ($.sameDay(current.start_date, date) || $.sameDay(current.stop_date, date) || (date >= current.start_date && date <= current.stop_date)) {
			className = 'gantt_scheduled';
			
			cell.attr('title', data[index].name + '<br />' + $.prefixLeadingZeroes(current.start_date.getHours()) + ':' + $.prefixLeadingZeroes(current.start_date.getMinutes()) + ' ' + current.start_date.getMonth() + '/' + current.start_date.getDate() + '/' + current.start_date.getFullYear() + ' - ' + $.prefixLeadingZeroes(current.stop_date.getHours()) + ':' + $.prefixLeadingZeroes(current.stop_date.getMinutes()) + ' ' + current.stop_date.getMonth() + '/' + current.stop_date.getDate() + '/' + current.stop_date.getFullYear());
			cell.simpletooltip();
		} else {
			className = 'gantt_unscheduled';
		}
		
		cell.addClass(className).appendTo(rows[index]);
	}
};

$.tableHeaders = function (table) {
	var headers;
	
	table = $(table);
	
	headers = table.find('th');
	
	if (headers.size() == 0)
		headers = table.find('tr:first td');
	
	return headers;
};

$.equalizeColumns = function (table) {
	var widest, headers;
	
	table = $(table);
	table.css('width', '100%');
	table.css('table-layout', 'fixed');
	
	headers = $.tableHeaders(table);
	
	widest = 0;
	
	headers.each(function (i) {
		var width;
		
		width = $(this).width;
		
		if (width > widest)
			widest = width;
	});
	
	headers.css('width', Math.floor(widest / table.parent().width()) + '%');
	
	return table;
};

$.fitColumns = function (table) {
	var headers, pct;
	
	table = $(table);
	table.css('width', '100%');
	table.css('table-layout', 'fixed');
	
	headers = $.tableHeaders(table);
	pct = Math.floor(100 / headers.size());
	headers.css('width', pct + '%');
	
	return (pct * table.width()) / 100;
};

$.mergeCells = function (table, selector, endcaps) {
	var rows;
	
	table = $(table);
	
	rows = table.find('tbody tr');
	
	if (rows.size() == 0)
		rows = table.find('tr');
	
	rows.each(function (i) {
		var cell, adjacent;
		
		cell = $(this).children(selector + ':first');
		
		adjacent = cell.nextAll(selector);
		
		if (endcaps) {
			if (adjacent.size() < 3)
				return;
			
			cell = adjacent.slice(0, 1);
			adjacent = adjacent.slice(1, -1);
		}
		
		adjacent.remove();
		cell.attr('colspan', 1 + adjacent.size());
	});
};

$.gantt = function (table, merge, endcaps) {
	var chart, body, data, first, last, header, date, millisecondsPerDay, rows, index, width, leftcap, rightcap;
	
	table = $(table || 'table'); // make sure it's a jquery object
	
	body = table.find('tbody');
	if (body.size() == 0)
		body = table;

	body = body.find('tr');
	
	data = [];
	first = new Date(2030, 0, 1);
	last = new Date(0);
	
	body.each(function (i) {
		var me = $(this), stage;
		
		stage = { name: me.find('.stage_name:first').text(), start_date: new Date(Date.parse(me.find('.stage_start:first').text())), stop_date: new Date(Date.parse(me.find('.stage_stop:first').text())) };
		data.push(stage);
		
		if (stage.start_date < first)
			first = stage.start_date;
		
		if (stage.stop_date > last)
			last = stage.stop_date;
	});
	
	chart = $(document.createElement('table'));
	chart.addClass('gantt-chart');
	
	header = $(document.createElement('thead'));
	
	headers = [];
	
	body = $(document.createElement('tbody'));
	rows = [];

	for (index in data)
		rows[index] = $(document.createElement('tr')).addClass('gantt_row gantt_' + (index % 5) + 'th');

	millisecondsPerDay = 24 * 60 * 60 * 1000;
	date = first;
	
	$.addGanttColumn(date, headers, rows, data);
	
	while (!$.sameDay(date, last) || $.sameDay(date, first)) {
		date = new Date(date.getTime() + millisecondsPerDay);
		
		$.addGanttColumn(date, headers, rows, data);
	}
	
	header = $(document.createElement('tr')).appendTo(header);
	
	for (index in headers)
		header.append('<th>' + headers[index] + '</th>');
		
	header.parent().appendTo(chart);
	
	for (index in rows)
		body.append(rows[index]);
		
	body.appendTo(chart);
	
	chart.hide();
	table.replaceWith(chart);
	width = $.fitColumns(chart); //$.equalizeColumns(chart);
	chart.find('th:odd').text('');
	
	if (merge)
		$.mergeCells(chart, '.gantt_scheduled', endcaps);

	if (endcaps) {
		leftcap = chart.find('tr td.gantt_scheduled:first');
		rightcap = chart.find('tr td.gantt_scheduled:last');

		if (leftcap[0] != rightcap[0]) {			
			leftcap.addClass('gantt_first');
			rightcap.addClass('gantt_last');
		}
	}
	
	// column color change on hover
	chart.find('td').hover(
			function () { // over
				var i;
			
				i = $(this).parent().children().index(this);
				
				chart.find('td:nth-child(' + (i + 1) + '), th:nth-child(' + (i + 1) + ')').addClass('gantt_hover'); 
			},
			
			function () { // out
				var i;
			
				i = $(this).parent().children().index(this);
			
				chart.find('td:nth-child(' + (i + 1) + '), th:nth-child(' + (i + 1) + ')').removeClass('gantt_hover');
			}
	);
	
	chart.show();
};