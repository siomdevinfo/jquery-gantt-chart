$.MS_PER_DAY = 24 * 60 * 60 * 1000;

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

$.addGanttColumn = function (date, headers, rows, data, interval, cellClickHandler) {
	var index, current, className, cell, day_interval, next_date, header, add_column;
	
	day_interval = interval && (interval <= $.MS_PER_DAY);
	
	header = (date.getMonth() + 1) + '/' + date.getDate();

	next_date = new Date(date.getTime() + interval);
	
	if (!day_interval)
		header += '-' + (next_date.getMonth() + 1) + '/' + next_date.getDate();
	
	headers.push(header);
	
	for (index in data) {		     
		current = data[index];
		
		cell = $(document.createElement('td'));
		cell.data('date', date);
		cell.data('next_date', next_date);

		className = 'gantt_unscheduled';
		
		add_column = false;
		
		if (day_interval) {
			if ($.sameDay(current.start_date, date) || $.sameDay(current.stop_date, date) || ((date >= current.start_date) && (date <= current.stop_date)))
				add_column = true;
		} else { // different comparison for ranges		
			if ((current.start_date < next_date) && (current.stop_date >= date))
				add_column = true;
		}
		
		if (add_column) {
			className = 'gantt_scheduled';
			
			cell.attr('title', current.name + '<br />' + $.prefixLeadingZeroes(current.start_date.getHours()) + ':' + $.prefixLeadingZeroes(current.start_date.getMinutes()) + ' ' + (current.start_date.getMonth() + 1) + '/' + current.start_date.getDate() + '/' + current.start_date.getFullYear() + ' - ' + $.prefixLeadingZeroes(current.stop_date.getHours()) + ':' + $.prefixLeadingZeroes(current.stop_date.getMinutes()) + ' ' + (current.stop_date.getMonth() + 1) + '/' + current.stop_date.getDate() + '/' + current.stop_date.getFullYear());
			cell.simpletooltip();
			
			if (cellClickHandler) {
				cell.data('stage', current);
				
				cell.click(function () { cellClickHandler($(this).data('stage')); });
			}
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

$.equalizeColumns = function (table, width) {
	var widest, headers;
	
	table = $(table);
	table.css('width', width ? Math.floor(width * 100) + '%' : '100%');
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

$.fitColumns = function (table, width) {
	var headers, pct;
	
	table = $(table);
	table.css('width', width ? Math.floor(width * 100) + '%' : '100%');
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

$.gantt = function (table, merge, endcaps, width, maxcells, mindate, maxdate, cellClickHandler) {
	var chart, body, data, first, last, header, date, rows, index, width, leftcap, rightcap, days, daysPerCell, interval;
	
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
		
		if (!mindate && stage.start_date < first)
			first = stage.start_date;
		
		if (!maxdate && stage.stop_date > last)
			last = stage.stop_date;
	});
	
	if (mindate)
		first = mindate;
	
	if (maxdate)
		last = maxdate;
	
	chart = $(document.createElement('table'));
	chart.addClass('gantt-chart');
	chart.hide();
	table.replaceWith(chart);
	
	header = $(document.createElement('thead'));
	
	headers = [];
	
	body = $(document.createElement('tbody'));
	rows = [];

	for (index in data)
		rows[index] = $(document.createElement('tr')).addClass('gantt_row gantt_' + (index % 5) + 'th');

	date = new Date(first.getFullYear(), first.getMonth(), first.getDate());
	
	if (maxcells) {
		total_days = ((new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59).getTime() - new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime()) / $.MS_PER_DAY) + 1;
		daysPerCell = Math.floor(total_days / maxcells);
		interval = daysPerCell * $.MS_PER_DAY;
	} else {
		interval = $.MS_PER_DAY;
	}
	
	$.addGanttColumn(date, headers, rows, data, interval, cellClickHandler);

	while ((date < last) || $.sameDay(date, last)) {
		date = new Date(date.getTime() + interval);
		
		$.addGanttColumn(date, headers, rows, data, interval, cellClickHandler);
		
		if (headers.length == maxcells)
			break;
	}
	
	header = $(document.createElement('tr')).appendTo(header);
	
	for (index in headers)
		header.append('<th>' + headers[index] + '</th>');
		
	header.parent().appendTo(chart);
	
	for (index in rows)
		body.append(rows[index]);
		
	body.appendTo(chart);
	
	$.fitColumns(chart, width);
	
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
	
	body.find('td.gantt_scheduled').each(function (i, cell) {
		var range, innerRange, next_date, current, date, interval;
		
		cell = $(cell);
		
		current = cell.data('stage');
		date = cell.data('date');
		next_date = cell.data('next_date');
		
		range = $(document.createElement('div'));
		
		range.addClass('gantt_range');
		
		innerRange = Math.min(next_date.getTime(), current.stop_date.getTime()) - Math.max(date.getTime(), current.start_date.getTime());
		interval = next_date.getTime() - date.getTime();
		
		range.width(Math.round((cell.innerWidth() * innerRange) / interval));
		range.height(cell.innerHeight());
		range.css('margin-left', Math.round(((Math.max(current.start_date.getTime(), date.getTime()) - date.getTime()) * cell.innerWidth()) / interval) + 'px');
		
		range.appendTo(cell);
	});
	
	return chart;
};