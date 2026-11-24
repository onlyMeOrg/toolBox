// Seed programs for the training data: small, correct Rust, each proven by the real compiler
// (gen.html runs the tests before using a seed). None of them is a task of the measuring set
// (../tasks.mjs): gen.mjs refuses to run if a function name here also appears there.
// kind "fn": `tests` is appended as a #[test]. kind "tile": `body` goes inside the pixel loop.
import { TILE_HEAD } from '../tasks.mjs';
import { IMPORTED } from './imported.mjs';

const R = String.raw;
const fn = (id, ask, tests, code) => ({ id, kind: 'fn', ask, tests, code: code.replace(/^\n/, '') });
const TILE_TAIL = `        }
    }
    pixels.as_ptr()
}
`;
const tile = (id, ask, body) => ({ id, kind: 'tile', ask, code: TILE_HEAD + body.replace(/^\n/, '') + TILE_TAIL });

const OWN = [
	fn('count_evens', 'Write `pub fn count_evens(values: &[i32]) -> usize` that returns how many of the values are even.',
		'assert_eq!(count_evens(&[]), 0); assert_eq!(count_evens(&[1, 2, 3, 4, -6]), 3); assert_eq!(count_evens(&[7, 9]), 0);', R`
pub fn count_evens(values: &[i32]) -> usize {
    let mut count = 0;
    for value in values {
        if *value % 2 == 0 {
            count += 1;
        }
    }
    count
}
`),
	fn('power', 'Write `pub fn power(base: u64, exp: u32) -> u64` that raises base to exp by repeated squaring. power(x, 0) is 1.',
		'assert_eq!(power(2, 10), 1024); assert_eq!(power(7, 0), 1); assert_eq!(power(3, 13), 1594323); assert_eq!(power(10, 18), 1000000000000000000);', R`
pub fn power(base: u64, exp: u32) -> u64 {
    let mut result = 1u64;
    let mut factor = base;
    let mut left = exp;
    while left > 0 {
        if left % 2 == 1 {
            result *= factor;
        }
        left /= 2;
        if left > 0 {
            factor *= factor;
        }
    }
    result
}
`),
	fn('perfect_square', 'Write `pub fn is_perfect_square(n: u64) -> bool` that says whether n is the square of an integer. Do not use floating point.',
		'assert!(is_perfect_square(0)); assert!(is_perfect_square(1)); assert!(is_perfect_square(144)); assert!(!is_perfect_square(145)); assert!(is_perfect_square(1000000007 * 1000000007)); assert!(!is_perfect_square(2));', R`
pub fn is_perfect_square(n: u64) -> bool {
    let mut low = 0u64;
    let mut high = 4294967296u64;
    while low < high {
        let mid = (low + high) / 2;
        if (mid as u128) * (mid as u128) < n as u128 {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    (low as u128) * (low as u128) == n as u128
}
`),
	fn('digits', 'Write `pub fn digits(n: u64) -> Vec<u8>` that returns the decimal digits of n, most significant first. digits(0) is [0].',
		'assert_eq!(digits(0), vec![0]); assert_eq!(digits(7), vec![7]); assert_eq!(digits(9051), vec![9, 0, 5, 1]);', R`
pub fn digits(n: u64) -> Vec<u8> {
    if n == 0 {
        return vec![0];
    }
    let mut out = Vec::new();
    let mut left = n;
    while left > 0 {
        out.push((left % 10) as u8);
        left /= 10;
    }
    out.reverse();
    out
}
`),
	fn('ordinal', 'Write `pub fn ordinal(n: u32) -> String` that returns the English ordinal: 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 112th.',
		'assert_eq!(ordinal(1), "1st"); assert_eq!(ordinal(2), "2nd"); assert_eq!(ordinal(3), "3rd"); assert_eq!(ordinal(4), "4th"); assert_eq!(ordinal(11), "11th"); assert_eq!(ordinal(12), "12th"); assert_eq!(ordinal(13), "13th"); assert_eq!(ordinal(21), "21st"); assert_eq!(ordinal(112), "112th"); assert_eq!(ordinal(103), "103rd");', R`
pub fn ordinal(n: u32) -> String {
    let suffix = if n % 100 >= 11 && n % 100 <= 13 {
        "th"
    } else {
        match n % 10 {
            1 => "st",
            2 => "nd",
            3 => "rd",
            _ => "th",
        }
    };
    format!("{}{}", n, suffix)
}
`),
	fn('clamp_all', 'Write `pub fn clamp_all(values: &[i32], low: i32, high: i32) -> Vec<i32>` that returns the values with each one limited to the range low..=high.',
		'assert_eq!(clamp_all(&[-5, 0, 5, 10, 15], 0, 10), vec![0, 0, 5, 10, 10]); assert_eq!(clamp_all(&[], 0, 1), Vec::<i32>::new());', R`
pub fn clamp_all(values: &[i32], low: i32, high: i32) -> Vec<i32> {
    let mut out = Vec::with_capacity(values.len());
    for &value in values {
        if value < low {
            out.push(low);
        } else if value > high {
            out.push(high);
        } else {
            out.push(value);
        }
    }
    out
}
`),
	fn('longest_word', 'Write `pub fn longest_word(text: &str) -> &str` that returns the longest word (words are separated by whitespace). With a tie, the first one wins. An empty text gives "".',
		'assert_eq!(longest_word("a quick brown fox"), "quick"); assert_eq!(longest_word(""), ""); assert_eq!(longest_word("  one   three  "), "three"); assert_eq!(longest_word("ab cd"), "ab");', R`
pub fn longest_word(text: &str) -> &str {
    let mut best = "";
    for word in text.split_whitespace() {
        if word.chars().count() > best.chars().count() {
            best = word;
        }
    }
    best
}
`),
	fn('swap_case', 'Write `pub fn swap_case(text: &str) -> String` that turns upper case letters into lower case and lower case into upper case; other characters stay.',
		'assert_eq!(swap_case("Hello, World 42"), "hELLO, wORLD 42"); assert_eq!(swap_case(""), "");', R`
pub fn swap_case(text: &str) -> String {
    let mut out = String::new();
    for c in text.chars() {
        if c.is_uppercase() {
            out.extend(c.to_lowercase());
        } else if c.is_lowercase() {
            out.extend(c.to_uppercase());
        } else {
            out.push(c);
        }
    }
    out
}
`),
	fn('is_sorted', 'Write `pub fn is_sorted(values: &[i32]) -> bool` that says whether the values never decrease. An empty slice is sorted.',
		'assert!(is_sorted(&[])); assert!(is_sorted(&[1])); assert!(is_sorted(&[1, 1, 2, 9])); assert!(!is_sorted(&[1, 3, 2]));', R`
pub fn is_sorted(values: &[i32]) -> bool {
    for i in 1..values.len() {
        if values[i - 1] > values[i] {
            return false;
        }
    }
    true
}
`),
	fn('mean', 'Write `pub fn mean(values: &[f64]) -> Option<f64>` that returns the arithmetic mean, or None for an empty slice.',
		'assert_eq!(mean(&[]), None); assert_eq!(mean(&[2.0, 4.0, 9.0]), Some(5.0)); assert_eq!(mean(&[-1.5]), Some(-1.5));', R`
pub fn mean(values: &[f64]) -> Option<f64> {
    if values.is_empty() {
        return None;
    }
    let mut total = 0.0;
    for value in values {
        total += *value;
    }
    Some(total / values.len() as f64)
}
`),
	fn('min_max', 'Write `pub fn min_max(values: &[i32]) -> Option<(i32, i32)>` that returns the smallest and the largest value, or None for an empty slice.',
		'assert_eq!(min_max(&[]), None); assert_eq!(min_max(&[4]), Some((4, 4))); assert_eq!(min_max(&[3, -2, 8, 0]), Some((-2, 8)));', R`
pub fn min_max(values: &[i32]) -> Option<(i32, i32)> {
    let first = *values.first()?;
    let mut low = first;
    let mut high = first;
    for &value in values {
        if value < low {
            low = value;
        }
        if value > high {
            high = value;
        }
    }
    Some((low, high))
}
`),
	fn('zip_sum', 'Write `pub fn zip_sum(a: &[i32], b: &[i32]) -> Vec<i32>` that adds the two slices element by element; the result has the length of the shorter one.',
		'assert_eq!(zip_sum(&[1, 2, 3], &[10, 20, 30]), vec![11, 22, 33]); assert_eq!(zip_sum(&[1, 2, 3], &[5]), vec![6]); assert_eq!(zip_sum(&[], &[5]), Vec::<i32>::new());', R`
pub fn zip_sum(a: &[i32], b: &[i32]) -> Vec<i32> {
    a.iter().zip(b.iter()).map(|(x, y)| x + y).collect()
}
`),
	fn('char_freq', 'Write `pub fn char_freq(text: &str) -> std::collections::HashMap<char, usize>` that counts how many times each character appears.',
		'let f = char_freq("banana"); assert_eq!(f.len(), 3); assert_eq!(f[&\'a\'], 3); assert_eq!(f[&\'n\'], 2); assert_eq!(f[&\'b\'], 1); assert!(char_freq("").is_empty());', R`
use std::collections::HashMap;

pub fn char_freq(text: &str) -> HashMap<char, usize> {
    let mut counts = HashMap::new();
    for c in text.chars() {
        *counts.entry(c).or_insert(0) += 1;
    }
    counts
}
`),
	fn('most_common', 'Write `pub fn most_common(values: &[i32]) -> Option<i32>` that returns the value that appears most often; with a tie, the smallest of them. None for an empty slice.',
		'assert_eq!(most_common(&[]), None); assert_eq!(most_common(&[3, 1, 3, 2, 1, 3]), Some(3)); assert_eq!(most_common(&[5, 4, 5, 4]), Some(4));', R`
use std::collections::BTreeMap;

pub fn most_common(values: &[i32]) -> Option<i32> {
    let mut counts = BTreeMap::new();
    for &value in values {
        *counts.entry(value).or_insert(0usize) += 1;
    }
    let mut best: Option<(i32, usize)> = None;
    for (value, count) in counts {
        match best {
            Some((_, most)) if most >= count => {}
            _ => best = Some((value, count)),
        }
    }
    best.map(|(value, _)| value)
}
`),
	fn('flatten', 'Write `pub fn flatten(rows: &[Vec<i32>]) -> Vec<i32>` that joins the rows into one vector, in order.',
		'assert_eq!(flatten(&[vec![1, 2], vec![], vec![3]]), vec![1, 2, 3]); assert_eq!(flatten(&[]), Vec::<i32>::new());', R`
pub fn flatten(rows: &[Vec<i32>]) -> Vec<i32> {
    let mut out = Vec::new();
    for row in rows {
        out.extend(row.iter().copied());
    }
    out
}
`),
	fn('chunks_of', 'Write `pub fn chunks_of(values: &[i32], size: usize) -> Vec<Vec<i32>>` that splits the values into consecutive groups of `size`; the last group may be shorter. A size of 0 gives an empty result.',
		'assert_eq!(chunks_of(&[1, 2, 3, 4, 5], 2), vec![vec![1, 2], vec![3, 4], vec![5]]); assert_eq!(chunks_of(&[1, 2], 0), Vec::<Vec<i32>>::new()); assert_eq!(chunks_of(&[], 3), Vec::<Vec<i32>>::new());', R`
pub fn chunks_of(values: &[i32], size: usize) -> Vec<Vec<i32>> {
    let mut out = Vec::new();
    if size == 0 {
        return out;
    }
    let mut start = 0;
    while start < values.len() {
        let end = (start + size).min(values.len());
        out.push(values[start..end].to_vec());
        start = end;
    }
    out
}
`),
	fn('interleave', 'Write `pub fn interleave(a: &[i32], b: &[i32]) -> Vec<i32>` that alternates the elements of a and b, starting with a; what is left of the longer one goes at the end.',
		'assert_eq!(interleave(&[1, 3, 5], &[2, 4]), vec![1, 2, 3, 4, 5]); assert_eq!(interleave(&[], &[7, 8]), vec![7, 8]); assert_eq!(interleave(&[1], &[2, 3, 4]), vec![1, 2, 3, 4]);', R`
pub fn interleave(a: &[i32], b: &[i32]) -> Vec<i32> {
    let mut out = Vec::with_capacity(a.len() + b.len());
    let longest = a.len().max(b.len());
    for i in 0..longest {
        if i < a.len() {
            out.push(a[i]);
        }
        if i < b.len() {
            out.push(b[i]);
        }
    }
    out
}
`),
	fn('hamming', 'Write `pub fn hamming(a: &str, b: &str) -> Option<usize>` that counts the positions where the two texts differ, character by character, or None when they have different lengths.',
		'assert_eq!(hamming("karolin", "kathrin"), Some(3)); assert_eq!(hamming("", ""), Some(0)); assert_eq!(hamming("ab", "abc"), None); assert_eq!(hamming("ação", "acao"), Some(2));', R`
pub fn hamming(a: &str, b: &str) -> Option<usize> {
    if a.chars().count() != b.chars().count() {
        return None;
    }
    let mut distance = 0;
    for (x, y) in a.chars().zip(b.chars()) {
        if x != y {
            distance += 1;
        }
    }
    Some(distance)
}
`),
	fn('split_fields', 'Write `pub fn split_fields(line: &str) -> Vec<String>` that splits a line at the commas and trims the spaces around each field. An empty line gives one empty field.',
		'assert_eq!(split_fields("a, b ,c"), vec!["a", "b", "c"]); assert_eq!(split_fields(""), vec![""]); assert_eq!(split_fields(" x ,, y"), vec!["x", "", "y"]);', R`
pub fn split_fields(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    for part in line.split(',') {
        fields.push(part.trim().to_string());
    }
    fields
}
`),
	fn('sum_numbers', 'Write `pub fn sum_numbers(text: &str) -> Result<i64, std::num::ParseIntError>` that adds the integers in a text separated by whitespace. An empty text gives Ok(0); a word that is not an integer gives the error.',
		'assert_eq!(sum_numbers("1 2 3"), Ok(6)); assert_eq!(sum_numbers(""), Ok(0)); assert_eq!(sum_numbers(" -4  10 "), Ok(6)); assert!(sum_numbers("1 two 3").is_err());', R`
use std::num::ParseIntError;

pub fn sum_numbers(text: &str) -> Result<i64, ParseIntError> {
    let mut total = 0i64;
    for word in text.split_whitespace() {
        let number: i64 = word.parse()?;
        total += number;
    }
    Ok(total)
}
`),
	fn('index_of', 'Write `pub fn index_of(items: &[String], target: &str) -> Option<usize>` that returns the position of the first item equal to target.',
		'let v = vec!["a".to_string(), "b".to_string(), "b".to_string()]; assert_eq!(index_of(&v, "b"), Some(1)); assert_eq!(index_of(&v, "z"), None); assert_eq!(index_of(&[], "a"), None);', R`
pub fn index_of(items: &[String], target: &str) -> Option<usize> {
    for (i, item) in items.iter().enumerate() {
        if item == target {
            return Some(i);
        }
    }
    None
}
`),
	fn('triangle_kind', 'Write `pub fn triangle_kind(a: u32, b: u32, c: u32) -> &\'static str` that returns "invalid" when the sides cannot form a triangle (a side of 0, or one side not shorter than the other two together), else "equilateral", "isosceles" or "scalene".',
		'assert_eq!(triangle_kind(3, 3, 3), "equilateral"); assert_eq!(triangle_kind(3, 4, 4), "isosceles"); assert_eq!(triangle_kind(3, 4, 5), "scalene"); assert_eq!(triangle_kind(1, 2, 3), "invalid"); assert_eq!(triangle_kind(0, 1, 1), "invalid");', R`
pub fn triangle_kind(a: u32, b: u32, c: u32) -> &'static str {
    if a == 0 || b == 0 || c == 0 {
        return "invalid";
    }
    if a + b <= c || a + c <= b || b + c <= a {
        return "invalid";
    }
    if a == b && b == c {
        "equilateral"
    } else if a == b || b == c || a == c {
        "isosceles"
    } else {
        "scalene"
    }
}
`),
	fn('dot', 'Write `pub fn dot(a: &[f64], b: &[f64]) -> f64` that returns the dot product of two vectors of the same length (stop at the shorter one if they differ).',
		'assert_eq!(dot(&[1.0, 2.0, 3.0], &[4.0, 5.0, 6.0]), 32.0); assert_eq!(dot(&[], &[]), 0.0); assert_eq!(dot(&[2.0], &[0.5, 9.0]), 1.0);', R`
pub fn dot(a: &[f64], b: &[f64]) -> f64 {
    let mut total = 0.0;
    for i in 0..a.len().min(b.len()) {
        total += a[i] * b[i];
    }
    total
}
`),
	fn('identity', 'Write `pub fn identity(n: usize) -> Vec<Vec<u32>>` that returns the n by n identity matrix.',
		'assert_eq!(identity(0), Vec::<Vec<u32>>::new()); assert_eq!(identity(1), vec![vec![1]]); assert_eq!(identity(3), vec![vec![1, 0, 0], vec![0, 1, 0], vec![0, 0, 1]]);', R`
pub fn identity(n: usize) -> Vec<Vec<u32>> {
    let mut rows = vec![vec![0u32; n]; n];
    for i in 0..n {
        rows[i][i] = 1;
    }
    rows
}
`),
	fn('pangram', 'Write `pub fn is_pangram(text: &str) -> bool` that says whether the text uses every letter from a to z at least once, ignoring case.',
		'assert!(is_pangram("The quick brown fox jumps over the lazy dog")); assert!(!is_pangram("The quick brown fox jumps over the lazy cat")); assert!(!is_pangram(""));', R`
pub fn is_pangram(text: &str) -> bool {
    let mut seen = [false; 26];
    for c in text.chars() {
        let lower = c.to_ascii_lowercase();
        if lower.is_ascii_lowercase() {
            seen[(lower as u8 - b'a') as usize] = true;
        }
    }
    seen.iter().all(|&found| found)
}
`),
	fn('initials', 'Write `pub fn initials(name: &str) -> String` that returns the first letter of each word, in upper case, with no separator.',
		'assert_eq!(initials("ada lovelace"), "AL"); assert_eq!(initials("  grace   brewster hopper "), "GBH"); assert_eq!(initials(""), "");', R`
pub fn initials(name: &str) -> String {
    let mut out = String::new();
    for word in name.split_whitespace() {
        if let Some(first) = word.chars().next() {
            out.extend(first.to_uppercase());
        }
    }
    out
}
`),
	fn('repeat_join', 'Write `pub fn repeat_join(word: &str, times: usize, separator: &str) -> String` that repeats the word that many times with the separator between repetitions.',
		'assert_eq!(repeat_join("ab", 3, "-"), "ab-ab-ab"); assert_eq!(repeat_join("x", 1, ", "), "x"); assert_eq!(repeat_join("x", 0, ", "), "");', R`
pub fn repeat_join(word: &str, times: usize, separator: &str) -> String {
    let mut out = String::new();
    for i in 0..times {
        if i > 0 {
            out.push_str(separator);
        }
        out.push_str(word);
    }
    out
}
`),
	fn('stack', 'Write a generic `pub struct Stack<T>` with `pub fn new() -> Self`, `push(&mut self, item: T)`, `pop(&mut self) -> Option<T>`, `peek(&self) -> Option<&T>`, `len(&self) -> usize` and `is_empty(&self) -> bool`.',
		'let mut s = Stack::new(); assert!(s.is_empty()); s.push(1); s.push(2); assert_eq!(s.len(), 2); assert_eq!(s.peek(), Some(&2)); assert_eq!(s.pop(), Some(2)); assert_eq!(s.pop(), Some(1)); assert_eq!(s.pop(), None); let mut t: Stack<String> = Stack::new(); t.push("a".to_string()); assert_eq!(t.peek().map(|x| x.as_str()), Some("a"));', R`
pub struct Stack<T> {
    items: Vec<T>,
}

impl<T> Stack<T> {
    pub fn new() -> Self {
        Stack { items: Vec::new() }
    }

    pub fn push(&mut self, item: T) {
        self.items.push(item);
    }

    pub fn pop(&mut self) -> Option<T> {
        self.items.pop()
    }

    pub fn peek(&self) -> Option<&T> {
        self.items.last()
    }

    pub fn len(&self) -> usize {
        self.items.len()
    }

    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }
}
`),
	fn('tally', 'Write `pub struct Tally` that counts words: `pub fn new() -> Self`, `add(&mut self, word: &str)`, `count(&self, word: &str) -> usize` and `total(&self) -> usize` (all the words added).',
		'let mut t = Tally::new(); assert_eq!(t.count("a"), 0); t.add("a"); t.add("b"); t.add("a"); assert_eq!(t.count("a"), 2); assert_eq!(t.count("b"), 1); assert_eq!(t.total(), 3);', R`
use std::collections::HashMap;

pub struct Tally {
    counts: HashMap<String, usize>,
}

impl Tally {
    pub fn new() -> Self {
        Tally { counts: HashMap::new() }
    }

    pub fn add(&mut self, word: &str) {
        *self.counts.entry(word.to_string()).or_insert(0) += 1;
    }

    pub fn count(&self, word: &str) -> usize {
        self.counts.get(word).copied().unwrap_or(0)
    }

    pub fn total(&self) -> usize {
        self.counts.values().sum()
    }
}
`),
	fn('shape', 'Write `pub enum Shape { Circle(f64), Rect(f64, f64), Square(f64) }` with `pub fn area(&self) -> f64` and `pub fn name(&self) -> &\'static str` ("circle", "rect", "square"). Use std::f64::consts::PI.',
		'assert_eq!(Shape::Rect(2.0, 3.5).area(), 7.0); assert_eq!(Shape::Square(3.0).area(), 9.0); assert!((Shape::Circle(1.0).area() - 3.14159265).abs() < 1e-6); assert_eq!(Shape::Circle(1.0).name(), "circle"); assert_eq!(Shape::Square(1.0).name(), "square");', R`
use std::f64::consts::PI;

pub enum Shape {
    Circle(f64),
    Rect(f64, f64),
    Square(f64),
}

impl Shape {
    pub fn area(&self) -> f64 {
        match self {
            Shape::Circle(radius) => PI * radius * radius,
            Shape::Rect(width, height) => width * height,
            Shape::Square(side) => side * side,
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            Shape::Circle(_) => "circle",
            Shape::Rect(_, _) => "rect",
            Shape::Square(_) => "square",
        }
    }
}
`),
	fn('describe', 'Write `pub trait Describe { fn describe(&self) -> String; }`, a `pub struct Dog { pub name: String }` and a `pub struct Car { pub wheels: u32 }` that implement it ("dog named Rex", "car with 4 wheels"), and `pub fn describe_all(items: &[&dyn Describe]) -> Vec<String>`.',
		'let d = Dog { name: "Rex".to_string() }; let c = Car { wheels: 4 }; assert_eq!(d.describe(), "dog named Rex"); assert_eq!(describe_all(&[&d, &c]), vec!["dog named Rex", "car with 4 wheels"]);', R`
pub trait Describe {
    fn describe(&self) -> String;
}

pub struct Dog {
    pub name: String,
}

pub struct Car {
    pub wheels: u32,
}

impl Describe for Dog {
    fn describe(&self) -> String {
        format!("dog named {}", self.name)
    }
}

impl Describe for Car {
    fn describe(&self) -> String {
        format!("car with {} wheels", self.wheels)
    }
}

pub fn describe_all(items: &[&dyn Describe]) -> Vec<String> {
    let mut out = Vec::new();
    for item in items {
        out.push(item.describe());
    }
    out
}
`),
	fn('bits_set', 'Write `pub fn bits_set(n: u32) -> u32` that counts the bits equal to 1, without calling count_ones.',
		'assert_eq!(bits_set(0), 0); assert_eq!(bits_set(1), 1); assert_eq!(bits_set(255), 8); assert_eq!(bits_set(0x8000_0001), 2); assert_eq!(bits_set(u32::MAX), 32);', R`
pub fn bits_set(n: u32) -> u32 {
    let mut count = 0;
    let mut left = n;
    while left != 0 {
        count += left & 1;
        left >>= 1;
    }
    count
}
`),
	fn('pad_left', 'Write `pub fn pad_left(text: &str, width: usize, fill: char) -> String` that puts fill characters before the text until it has `width` characters. A text already that long comes back unchanged.',
		'assert_eq!(pad_left("42", 5, \'0\'), "00042"); assert_eq!(pad_left("hello", 3, \' \'), "hello"); assert_eq!(pad_left("", 2, \'*\'), "**"); assert_eq!(pad_left("é", 3, \'.\'), "..é");', R`
pub fn pad_left(text: &str, width: usize, fill: char) -> String {
    let length = text.chars().count();
    let mut out = String::new();
    if length < width {
        for _ in 0..(width - length) {
            out.push(fill);
        }
    }
    out.push_str(text);
    out
}
`),
	fn('intersect', 'Write `pub fn intersect(a: &[i32], b: &[i32]) -> Vec<i32>` that returns the values present in both slices, each once, in ascending order.',
		'assert_eq!(intersect(&[3, 1, 2, 3], &[3, 2, 5, 2]), vec![2, 3]); assert_eq!(intersect(&[1], &[2]), Vec::<i32>::new()); assert_eq!(intersect(&[], &[]), Vec::<i32>::new());', R`
use std::collections::BTreeSet;

pub fn intersect(a: &[i32], b: &[i32]) -> Vec<i32> {
    let left: BTreeSet<i32> = a.iter().copied().collect();
    let right: BTreeSet<i32> = b.iter().copied().collect();
    left.intersection(&right).copied().collect()
}
`),
	fn('point', 'Write `#[derive(Debug, Clone, Copy, PartialEq)] pub struct Point { pub x: f64, pub y: f64 }` with `pub fn distance(&self, other: &Point) -> f64` and an implementation of `std::ops::Add` that adds the coordinates.',
		'let a = Point { x: 0.0, y: 0.0 }; let b = Point { x: 3.0, y: 4.0 }; assert_eq!(a.distance(&b), 5.0); assert_eq!(a + b, b); assert_eq!(b + b, Point { x: 6.0, y: 8.0 });', R`
use std::ops::Add;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl Point {
    pub fn distance(&self, other: &Point) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }
}

impl Add for Point {
    type Output = Point;

    fn add(self, other: Point) -> Point {
        Point { x: self.x + other.x, y: self.y + other.y }
    }
}
`),
	fn('countdown', 'Write `pub struct Countdown` with `pub fn new(from: u32) -> Self` that implements `Iterator<Item = u32>`: it yields from, from - 1, … down to 1, then ends.',
		'assert_eq!(Countdown::new(3).collect::<Vec<u32>>(), vec![3, 2, 1]); assert_eq!(Countdown::new(0).count(), 0); assert_eq!(Countdown::new(4).sum::<u32>(), 10);', R`
pub struct Countdown {
    left: u32,
}

impl Countdown {
    pub fn new(from: u32) -> Self {
        Countdown { left: from }
    }
}

impl Iterator for Countdown {
    type Item = u32;

    fn next(&mut self) -> Option<u32> {
        if self.left == 0 {
            return None;
        }
        let current = self.left;
        self.left -= 1;
        Some(current)
    }
}
`),
	fn('apply_times', 'Write `pub fn apply_times(f: impl Fn(i64) -> i64, times: u32, start: i64) -> i64` that applies f to start, then to the result, `times` times in all.',
		'assert_eq!(apply_times(|x| x * 2, 10, 1), 1024); assert_eq!(apply_times(|x| x - 3, 0, 7), 7); let k = 5; assert_eq!(apply_times(|x| x + k, 3, 0), 15);', R`
pub fn apply_times(f: impl Fn(i64) -> i64, times: u32, start: i64) -> i64 {
    let mut value = start;
    for _ in 0..times {
        value = f(value);
    }
    value
}
`),
	fn('bubble_sort', 'Write `pub fn bubble_sort(values: &mut [i32])` that sorts the slice in place, ascending, with bubble sort (no call to sort).',
		'let mut v = [5, 1, 4, 2, 8, 1]; bubble_sort(&mut v); assert_eq!(v, [1, 1, 2, 4, 5, 8]); let mut e: [i32; 0] = []; bubble_sort(&mut e); let mut one = [3]; bubble_sort(&mut one); assert_eq!(one, [3]);', R`
pub fn bubble_sort(values: &mut [i32]) {
    let n = values.len();
    for pass in 0..n {
        let mut swapped = false;
        for i in 1..(n - pass) {
            if values[i - 1] > values[i] {
                values.swap(i - 1, i);
                swapped = true;
            }
        }
        if !swapped {
            break;
        }
    }
}
`),
	fn('shorten', 'Write `pub fn shorten(text: &str, max: usize) -> String` that returns the text when it has at most `max` characters; otherwise its first `max` characters followed by "...".',
		'assert_eq!(shorten("hello world", 5), "hello..."); assert_eq!(shorten("hi", 5), "hi"); assert_eq!(shorten("ação!", 3), "açã..."); assert_eq!(shorten("abc", 3), "abc");', R`
pub fn shorten(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        return text.to_string();
    }
    let mut out: String = text.chars().take(max).collect();
    out.push_str("...");
    out
}
`),
	fn('group_by_len', 'Write `pub fn group_by_len(words: &[&str]) -> std::collections::BTreeMap<usize, Vec<String>>` that groups the words by their number of characters, keeping the order they came in.',
		'let g = group_by_len(&["to", "be", "or", "not", "a"]); assert_eq!(g.len(), 3); assert_eq!(g[&2], vec!["to", "be", "or"]); assert_eq!(g[&3], vec!["not"]); assert_eq!(g[&1], vec!["a"]);', R`
use std::collections::BTreeMap;

pub fn group_by_len(words: &[&str]) -> BTreeMap<usize, Vec<String>> {
    let mut groups: BTreeMap<usize, Vec<String>> = BTreeMap::new();
    for word in words {
        let length = word.chars().count();
        groups.entry(length).or_default().push(word.to_string());
    }
    groups
}
`),
	fn('parse_point', 'Write `pub fn parse_point(text: &str) -> Option<(i32, i32)>` that reads "x,y" (spaces around the numbers allowed) and returns None for anything else.',
		'assert_eq!(parse_point("3,4"), Some((3, 4))); assert_eq!(parse_point(" -1 , 20 "), Some((-1, 20))); assert_eq!(parse_point("3;4"), None); assert_eq!(parse_point("3,"), None); assert_eq!(parse_point("1,2,3"), None);', R`
pub fn parse_point(text: &str) -> Option<(i32, i32)> {
    let mut parts = text.split(',');
    let x = parts.next()?.trim().parse::<i32>().ok()?;
    let y = parts.next()?.trim().parse::<i32>().ok()?;
    if parts.next().is_some() {
        return None;
    }
    Some((x, y))
}
`),
	fn('temperature', 'Write `pub fn to_fahrenheit(celsius: f64) -> f64`, `pub fn to_celsius(fahrenheit: f64) -> f64` and `pub fn warmest(celsius: &[f64]) -> Option<f64>` (the highest reading, None when empty).',
		'assert_eq!(to_fahrenheit(100.0), 212.0); assert_eq!(to_celsius(32.0), 0.0); assert_eq!(warmest(&[12.5, 30.0, -4.0]), Some(30.0)); assert_eq!(warmest(&[]), None);', R`
pub fn to_fahrenheit(celsius: f64) -> f64 {
    celsius * 9.0 / 5.0 + 32.0
}

pub fn to_celsius(fahrenheit: f64) -> f64 {
    (fahrenheit - 32.0) * 5.0 / 9.0
}

pub fn warmest(celsius: &[f64]) -> Option<f64> {
    let mut best: Option<f64> = None;
    for &reading in celsius {
        best = match best {
            Some(current) if current >= reading => Some(current),
            _ => Some(reading),
        };
    }
    best
}
`),
	fn('title_lines', 'Write `pub fn number_lines(text: &str) -> String` that puts "1: ", "2: ", … before each line and joins them with "\\n" (no newline at the end). An empty text gives an empty string.',
		'assert_eq!(number_lines("a\\nb"), "1: a\\n2: b"); assert_eq!(number_lines(""), ""); assert_eq!(number_lines("only"), "1: only");', R`
pub fn number_lines(text: &str) -> String {
    let mut lines = Vec::new();
    for (i, line) in text.lines().enumerate() {
        lines.push(format!("{}: {}", i + 1, line));
    }
    lines.join("\n")
}
`),
	fn('account', 'Write `pub struct Account` with `pub fn new() -> Self`, `deposit(&mut self, cents: u64)`, `withdraw(&mut self, cents: u64) -> Result<(), String>` (an error "insufficient funds" when there is not enough, leaving the balance as it was) and `balance(&self) -> u64`.',
		'let mut a = Account::new(); a.deposit(500); assert_eq!(a.withdraw(200), Ok(())); assert_eq!(a.balance(), 300); assert_eq!(a.withdraw(301), Err("insufficient funds".to_string())); assert_eq!(a.balance(), 300);', R`
pub struct Account {
    cents: u64,
}

impl Account {
    pub fn new() -> Self {
        Account { cents: 0 }
    }

    pub fn deposit(&mut self, cents: u64) {
        self.cents += cents;
    }

    pub fn withdraw(&mut self, cents: u64) -> Result<(), String> {
        if cents > self.cents {
            return Err("insufficient funds".to_string());
        }
        self.cents -= cents;
        Ok(())
    }

    pub fn balance(&self) -> u64 {
        self.cents
    }
}
`),

	tile('t_blue_ramp', 'Write a tile program that fills the canvas with a vertical gradient: black at the top, pure blue at the bottom. Red and green stay 0 and alpha is 255.', R`
            pixels[i] = 0;
            pixels[i + 1] = 0;
            pixels[i + 2] = (y * 255 / (height - 1)) as u8;
            pixels[i + 3] = 255;
`),
	tile('t_thirds', 'Write a tile program that paints three vertical bands of equal width: green, white, red, from left to right. Alpha is 255.', R`
            let (r, g, b) = if x < width / 3 {
                (0, 255, 0)
            } else if x < 2 * width / 3 {
                (255, 255, 255)
            } else {
                (255, 0, 0)
            };
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
            pixels[i + 3] = 255;
`),
	tile('t_cross', 'Write a tile program that draws a yellow cross on a blue background: the middle column and the middle row, each 2 pixels thick. Alpha is 255.', R`
            let on_column = x + 1 == width / 2 || x == width / 2;
            let on_row = y + 1 == height / 2 || y == height / 2;
            if on_column || on_row {
                pixels[i] = 255;
                pixels[i + 1] = 255;
                pixels[i + 2] = 0;
            } else {
                pixels[i] = 0;
                pixels[i + 1] = 0;
                pixels[i + 2] = 255;
            }
            pixels[i + 3] = 255;
`),
	tile('t_grid', 'Write a tile program that draws gray grid lines (128, 128, 128) every 10 pixels, horizontally and vertically, on a white background. Alpha is 255.', R`
            let shade: u8 = if x % 10 == 0 || y % 10 == 0 { 128 } else { 255 };
            pixels[i] = shade;
            pixels[i + 1] = shade;
            pixels[i + 2] = shade;
            pixels[i + 3] = 255;
`),
	tile('t_rings', 'Write a tile program that draws concentric rings around the centre of the canvas: a pixel is white when its distance to the centre, divided by 4 and rounded down, is even; else black. Alpha is 255.', R`
            let dx = x as f64 - width as f64 / 2.0;
            let dy = y as f64 - height as f64 / 2.0;
            let ring = ((dx * dx + dy * dy).sqrt() / 4.0) as u32;
            let shade = if ring % 2 == 0 { 255 } else { 0 };
            pixels[i] = shade;
            pixels[i + 1] = shade;
            pixels[i + 2] = shade;
            pixels[i + 3] = 255;
`),
	tile('t_sweep', 'Write a tile program with a white vertical bar 4 pixels wide that moves to the right over a black background: its left edge is at (t_ms / 50) modulo the width. Alpha is 255.', R`
            let left = (t_ms as usize / 50) % width;
            let shade = if x >= left && x < left + 4 { 255 } else { 0 };
            pixels[i] = shade;
            pixels[i + 1] = shade;
            pixels[i + 2] = shade;
            pixels[i + 3] = 255;
`),
	tile('t_xor', 'Write a tile program that paints each pixel with a gray level equal to (x XOR y) modulo 256. Alpha is 255.', R`
            let shade = ((x ^ y) % 256) as u8;
            pixels[i] = shade;
            pixels[i + 1] = shade;
            pixels[i + 2] = shade;
            pixels[i + 3] = 255;
`),
	tile('t_quadrants', 'Write a tile program that paints the four quarters of the canvas: red top-left, green top-right, blue bottom-left, white bottom-right. Alpha is 255.', R`
            let right = x >= width / 2;
            let bottom = y >= height / 2;
            let (r, g, b) = match (right, bottom) {
                (false, false) => (255, 0, 0),
                (true, false) => (0, 255, 0),
                (false, true) => (0, 0, 255),
                (true, true) => (255, 255, 255),
            };
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
            pixels[i + 3] = 255;
`),
	tile('t_pulse', 'Write a tile program that fills the canvas with red whose brightness goes up and down with time: red is 128 + 127 * sin(t_ms / 500), green and blue are 0. Alpha is 255.', R`
            let level = 128.0 + 127.0 * (t_ms as f64 / 500.0).sin();
            pixels[i] = level as u8;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;
            pixels[i + 3] = 255;
`),
	tile('t_triangle', 'Write a tile program that paints the pixels below the diagonal (where y > x) orange (255, 128, 0) and the others black. Alpha is 255.', R`
            if y > x {
                pixels[i] = 255;
                pixels[i + 1] = 128;
                pixels[i + 2] = 0;
            } else {
                pixels[i] = 0;
                pixels[i + 1] = 0;
                pixels[i + 2] = 0;
            }
            pixels[i + 3] = 255;
`),

	// ---- what the site builds: pixels, sound, bytes for WebAssembly (second batch, 2026-11-12)
	fn('pack_rgba', 'Write `pub fn pack_rgba(r: u8, g: u8, b: u8, a: u8) -> u32` and `pub fn unpack_rgba(color: u32) -> (u8, u8, u8, u8)`. The packed value has r in the lowest byte, then g, b, and a in the highest byte (the order of bytes in a canvas, read as little-endian).',
		'assert_eq!(pack_rgba(1, 2, 3, 4), 0x04030201); assert_eq!(unpack_rgba(0x04030201), (1, 2, 3, 4)); assert_eq!(unpack_rgba(pack_rgba(255, 0, 128, 255)), (255, 0, 128, 255)); assert_eq!(pack_rgba(0, 0, 0, 255), 0xff000000);', R`
pub fn pack_rgba(r: u8, g: u8, b: u8, a: u8) -> u32 {
    (r as u32) | (g as u32) << 8 | (b as u32) << 16 | (a as u32) << 24
}

pub fn unpack_rgba(color: u32) -> (u8, u8, u8, u8) {
    (color as u8, (color >> 8) as u8, (color >> 16) as u8, (color >> 24) as u8)
}
`),
	fn('lerp_u8', 'Write `pub fn lerp_u8(a: u8, b: u8, t: u8) -> u8` that mixes a and b: t = 0 gives a, t = 255 gives b, linearly in between, rounding to the nearest. Use integers only.',
		'assert_eq!(lerp_u8(10, 200, 0), 10); assert_eq!(lerp_u8(10, 200, 255), 200); assert_eq!(lerp_u8(0, 255, 128), 128); assert_eq!(lerp_u8(200, 100, 51), 180); assert_eq!(lerp_u8(7, 7, 99), 7);', R`
pub fn lerp_u8(a: u8, b: u8, t: u8) -> u8 {
    let a = a as u32;
    let b = b as u32;
    let t = t as u32;
    ((a * (255 - t) + b * t + 127) / 255) as u8
}
`),
	fn('blend_over', 'Write `pub fn blend_over(dst: [u8; 4], src: [u8; 4]) -> [u8; 4]` that draws the RGBA colour src over the opaque colour dst: each of r, g, b is (src * alpha + dst * (255 - alpha)) / 255 with the alpha of src, and the result is opaque (alpha 255).',
		'assert_eq!(blend_over([10, 20, 30, 255], [200, 100, 50, 255]), [200, 100, 50, 255]); assert_eq!(blend_over([10, 20, 30, 255], [200, 100, 50, 0]), [10, 20, 30, 255]); assert_eq!(blend_over([0, 0, 0, 255], [255, 255, 255, 51]), [51, 51, 51, 255]); assert_eq!(blend_over([255, 0, 0, 255], [0, 0, 255, 102]), [153, 0, 102, 255]);', R`
pub fn blend_over(dst: [u8; 4], src: [u8; 4]) -> [u8; 4] {
    let alpha = src[3] as u32;
    let mut out = [255u8; 4];
    for c in 0..3 {
        out[c] = ((src[c] as u32 * alpha + dst[c] as u32 * (255 - alpha)) / 255) as u8;
    }
    out
}
`),
	fn('xorshift', 'Write `pub fn xorshift32(state: &mut u32) -> u32`: one step of the xorshift generator. Update the state with x ^= x << 13, x ^= x >> 17, x ^= x << 5 and return the new state.',
		'let mut s = 1u32; assert_eq!(xorshift32(&mut s), 270369); assert_eq!(s, 270369); assert_eq!(xorshift32(&mut s), 67634689); let mut t = 2463534242u32; assert_eq!(xorshift32(&mut t), 723471715);', R`
pub fn xorshift32(state: &mut u32) -> u32 {
    let mut x = *state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    *state = x;
    x
}
`),
	fn('to_pcm16', 'Write `pub fn to_pcm16(samples: &[f32]) -> Vec<i16>` that converts audio samples from the range -1.0..=1.0 to 16-bit integers: clamp each sample to that range, multiply by 32767 and round.',
		'assert_eq!(to_pcm16(&[0.0, 1.0, -1.0, 0.5]), vec![0, 32767, -32767, 16384]); assert_eq!(to_pcm16(&[2.0, -3.5]), vec![32767, -32767]); assert_eq!(to_pcm16(&[]), Vec::<i16>::new());', R`
pub fn to_pcm16(samples: &[f32]) -> Vec<i16> {
    samples
        .iter()
        .map(|s| (s.clamp(-1.0, 1.0) * 32767.0).round() as i16)
        .collect()
}
`),
	fn('rms', 'Write `pub fn rms(samples: &[f32]) -> f32` that returns the root mean square of the samples (the square root of the mean of the squares). An empty slice gives 0.0.',
		'assert_eq!(rms(&[]), 0.0); assert!((rms(&[1.0, -1.0, 1.0, -1.0]) - 1.0).abs() < 1e-6); assert!((rms(&[3.0, 4.0]) - 3.5355339).abs() < 1e-5); assert_eq!(rms(&[0.0, 0.0]), 0.0);', R`
pub fn rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum: f32 = samples.iter().map(|s| s * s).sum();
    (sum / samples.len() as f32).sqrt()
}
`),
	fn('one_pole', 'Write `pub fn smooth(samples: &[f32], amount: f32) -> Vec<f32>`: a one-pole low-pass filter. Keep a state y that starts at 0.0; for each sample x, y = y + amount * (x - y), and y is the output.',
		'assert_eq!(smooth(&[1.0, 1.0, 1.0], 0.5), vec![0.5, 0.75, 0.875]); assert_eq!(smooth(&[4.0, 0.0], 1.0), vec![4.0, 0.0]); assert_eq!(smooth(&[8.0, 8.0], 0.25), vec![2.0, 3.5]); assert!(smooth(&[], 0.5).is_empty());', R`
pub fn smooth(samples: &[f32], amount: f32) -> Vec<f32> {
    let mut y = 0.0f32;
    let mut out = Vec::with_capacity(samples.len());
    for &x in samples {
        y += amount * (x - y);
        out.push(y);
    }
    out
}
`),
	fn('zero_crossings', 'Write `pub fn zero_crossings(samples: &[f32]) -> usize` that counts how many times the signal changes sign between one sample and the next. Treat 0.0 as positive.',
		'assert_eq!(zero_crossings(&[1.0, -1.0, 1.0, -1.0]), 3); assert_eq!(zero_crossings(&[1.0, 2.0, 0.0, 3.0]), 0); assert_eq!(zero_crossings(&[-1.0, -2.0, 0.5]), 1); assert_eq!(zero_crossings(&[]), 0); assert_eq!(zero_crossings(&[0.3]), 0);', R`
pub fn zero_crossings(samples: &[f32]) -> usize {
    samples
        .windows(2)
        .filter(|pair| (pair[0] >= 0.0) != (pair[1] >= 0.0))
        .count()
}
`),
	fn('ring_buffer', 'Write a fixed-size ring buffer of audio samples: `pub struct Ring` with `pub fn new(capacity: usize) -> Self`, `pub fn push(&mut self, sample: f32)` (when full, the oldest sample is overwritten) and `pub fn to_vec(&self) -> Vec<f32>` that returns the samples it holds from the oldest to the newest.',
		'let mut r = Ring::new(3); assert!(r.to_vec().is_empty()); r.push(1.0); r.push(2.0); assert_eq!(r.to_vec(), vec![1.0, 2.0]); r.push(3.0); r.push(4.0); assert_eq!(r.to_vec(), vec![2.0, 3.0, 4.0]); r.push(5.0); r.push(6.0); r.push(7.0); assert_eq!(r.to_vec(), vec![5.0, 6.0, 7.0]);', R`
pub struct Ring {
    data: Vec<f32>,
    next: usize,
    filled: usize,
}

impl Ring {
    pub fn new(capacity: usize) -> Self {
        Ring { data: vec![0.0; capacity], next: 0, filled: 0 }
    }

    pub fn push(&mut self, sample: f32) {
        self.data[self.next] = sample;
        self.next = (self.next + 1) % self.data.len();
        if self.filled < self.data.len() {
            self.filled += 1;
        }
    }

    pub fn to_vec(&self) -> Vec<f32> {
        let start = (self.next + self.data.len() - self.filled) % self.data.len();
        (0..self.filled).map(|k| self.data[(start + k) % self.data.len()]).collect()
    }
}
`),
	fn('life_step', 'Write `pub fn life_step(cells: &[u8], width: usize, height: usize) -> Vec<u8>`: one generation of the Game of Life. `cells` has one byte per cell, row by row (1 alive, 0 dead). Cells outside the grid are dead. A live cell with 2 or 3 live neighbours stays alive; a dead cell with exactly 3 becomes alive.',
		'let blinker = [0, 1, 0, 0, 1, 0, 0, 1, 0]; assert_eq!(life_step(&blinker, 3, 3), vec![0, 0, 0, 1, 1, 1, 0, 0, 0]); let block = [1, 1, 1, 1]; assert_eq!(life_step(&block, 2, 2), vec![1, 1, 1, 1]); assert_eq!(life_step(&[1, 0, 0, 0], 2, 2), vec![0, 0, 0, 0]);', R`
pub fn life_step(cells: &[u8], width: usize, height: usize) -> Vec<u8> {
    let mut next = vec![0u8; cells.len()];
    for y in 0..height {
        for x in 0..width {
            let mut around = 0;
            for dy in -1i32..=1 {
                for dx in -1i32..=1 {
                    let nx = x as i32 + dx;
                    let ny = y as i32 + dy;
                    if (dx != 0 || dy != 0) && nx >= 0 && ny >= 0 && (nx as usize) < width && (ny as usize) < height {
                        around += cells[ny as usize * width + nx as usize];
                    }
                }
            }
            let alive = cells[y * width + x] == 1;
            next[y * width + x] = (around == 3 || (alive && around == 2)) as u8;
        }
    }
    next
}
`),
	fn('fx_mul', 'Write `pub fn fx_mul(a: i32, b: i32) -> i32` that multiplies two fixed-point numbers in 16.16 format (the value is the integer divided by 65536). Use a 64-bit intermediate so it does not overflow.',
		'assert_eq!(fx_mul(65536, 65536), 65536); assert_eq!(fx_mul(2 * 65536, 3 * 65536), 6 * 65536); assert_eq!(fx_mul(32768, 32768), 16384); assert_eq!(fx_mul(-65536, 5 * 65536), -5 * 65536); assert_eq!(fx_mul(1000 * 65536, 30 * 65536), 30000 * 65536);', R`
pub fn fx_mul(a: i32, b: i32) -> i32 {
    ((a as i64 * b as i64) >> 16) as i32
}
`),
	fn('u32_le', 'Write `pub fn write_u32_le(buf: &mut [u8], at: usize, value: u32) -> bool` that stores value as 4 little-endian bytes starting at index `at` and returns true, or returns false without writing when it does not fit; and `pub fn read_u32_le(buf: &[u8], at: usize) -> Option<u32>` that reads it back.',
		'let mut b = [0u8; 6]; assert!(write_u32_le(&mut b, 1, 0x11223344)); assert_eq!(b, [0, 0x44, 0x33, 0x22, 0x11, 0]); assert_eq!(read_u32_le(&b, 1), Some(0x11223344)); assert!(!write_u32_le(&mut b, 3, 1)); assert_eq!(read_u32_le(&b, 3), None); assert_eq!(read_u32_le(&b, 2), Some(0x00112233));', R`
pub fn write_u32_le(buf: &mut [u8], at: usize, value: u32) -> bool {
    if at + 4 > buf.len() {
        return false;
    }
    buf[at..at + 4].copy_from_slice(&value.to_le_bytes());
    true
}

pub fn read_u32_le(buf: &[u8], at: usize) -> Option<u32> {
    let bytes = buf.get(at..at + 4)?;
    Some(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
}
`),
	fn('leb128', 'Write `pub fn leb128(value: u32) -> Vec<u8>` that encodes an unsigned integer as LEB128, the format WebAssembly uses for numbers: 7 bits per byte from the lowest, with the high bit set on every byte except the last; and `pub fn leb128_read(bytes: &[u8]) -> Option<(u32, usize)>` that decodes one and returns the value and how many bytes it used, or None when the input ends too soon.',
		'assert_eq!(leb128(0), vec![0]); assert_eq!(leb128(127), vec![127]); assert_eq!(leb128(128), vec![0x80, 1]); assert_eq!(leb128(624485), vec![0xe5, 0x8e, 0x26]); assert_eq!(leb128_read(&[0xe5, 0x8e, 0x26, 9]), Some((624485, 3))); assert_eq!(leb128_read(&[0x80]), None); assert_eq!(leb128_read(&leb128(u32::MAX)), Some((u32::MAX, 5)));', R`
pub fn leb128(value: u32) -> Vec<u8> {
    let mut left = value;
    let mut out = Vec::new();
    loop {
        let byte = (left & 0x7f) as u8;
        left >>= 7;
        if left == 0 {
            out.push(byte);
            return out;
        }
        out.push(byte | 0x80);
    }
}

pub fn leb128_read(bytes: &[u8]) -> Option<(u32, usize)> {
    let mut value = 0u32;
    for (n, &byte) in bytes.iter().enumerate().take(5) {
        value |= ((byte & 0x7f) as u32) << (7 * n);
        if byte & 0x80 == 0 {
            return Some((value, n + 1));
        }
    }
    None
}
`),
	fn('is_wasm', 'Write `pub fn wasm_version(bytes: &[u8]) -> Option<u32>` that checks the header of a WebAssembly module: the first four bytes must be 0x00 0x61 0x73 0x6d ("\\0asm"), and the next four are the version as a little-endian u32, which is returned. Anything else gives None.',
		'assert_eq!(wasm_version(&[0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]), Some(1)); assert_eq!(wasm_version(&[0, 0x61, 0x73, 0x6d, 13, 0, 0, 0, 7, 7]), Some(13)); assert_eq!(wasm_version(&[0, 0x61, 0x73, 0x6d, 1, 0]), None); assert_eq!(wasm_version(&[1, 0x61, 0x73, 0x6d, 1, 0, 0, 0]), None); assert_eq!(wasm_version(&[]), None);', R`
pub fn wasm_version(bytes: &[u8]) -> Option<u32> {
    if bytes.len() < 8 || bytes[..4] != [0, 0x61, 0x73, 0x6d] {
        return None;
    }
    Some(u32::from_le_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]))
}
`),
	fn('frames_per_beat', 'Write `pub fn frames_per_beat(bpm: u32, sample_rate: u32) -> u32` that returns how many audio frames one beat lasts, rounded to the nearest. A bpm of 0 gives 0.',
		'assert_eq!(frames_per_beat(120, 48000), 24000); assert_eq!(frames_per_beat(60, 44100), 44100); assert_eq!(frames_per_beat(90, 44100), 29400); assert_eq!(frames_per_beat(7, 48000), 411429); assert_eq!(frames_per_beat(0, 48000), 0);', R`
pub fn frames_per_beat(bpm: u32, sample_rate: u32) -> u32 {
    if bpm == 0 {
        return 0;
    }
    ((sample_rate as u64 * 60 + bpm as u64 / 2) / bpm as u64) as u32
}
`),
	fn('midi_hz', 'Write `pub fn midi_to_hz(note: u8) -> f64` that returns the frequency of a MIDI note in equal temperament, where note 69 is 440 Hz and each semitone multiplies the frequency by the twelfth root of 2.',
		'assert!((midi_to_hz(69) - 440.0).abs() < 1e-9); assert!((midi_to_hz(81) - 880.0).abs() < 1e-9); assert!((midi_to_hz(60) - 261.6255653).abs() < 1e-6); assert!((midi_to_hz(40) - 82.4068892).abs() < 1e-6);', R`
pub fn midi_to_hz(note: u8) -> f64 {
    440.0 * 2f64.powf((note as f64 - 69.0) / 12.0)
}
`),
	fn('to_gray', 'Write `pub fn to_gray(pixels: &mut [u8])` that turns RGBA pixels (4 bytes each) to gray in place: r, g and b all become (r * 77 + g * 150 + b * 29) / 256, and alpha is kept.',
		'let mut p = [255, 255, 255, 200, 255, 0, 0, 255, 0, 0, 0, 9]; to_gray(&mut p); assert_eq!(p, [255, 255, 255, 200, 76, 76, 76, 255, 0, 0, 0, 9]); let mut q = [0, 255, 0, 1, 0, 0, 255, 2]; to_gray(&mut q); assert_eq!(q, [149, 149, 149, 1, 28, 28, 28, 2]);', R`
pub fn to_gray(pixels: &mut [u8]) {
    for pixel in pixels.chunks_exact_mut(4) {
        let gray = (pixel[0] as u32 * 77 + pixel[1] as u32 * 150 + pixel[2] as u32 * 29) / 256;
        pixel[0] = gray as u8;
        pixel[1] = gray as u8;
        pixel[2] = gray as u8;
    }
}
`),
	fn('flip_rows', 'Write `pub fn flip_rows(pixels: &mut [u8], width: usize, height: usize)` that flips an RGBA image upside down in place (4 bytes per pixel, row by row): the first row trades places with the last, and so on.',
		'let mut p = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]; flip_rows(&mut p, 1, 3); assert_eq!(p, [3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1]); let mut q = [1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0]; flip_rows(&mut q, 2, 2); assert_eq!(q, [3, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0]);', R`
pub fn flip_rows(pixels: &mut [u8], width: usize, height: usize) {
    let row = width * 4;
    for y in 0..height / 2 {
        let (top, bottom) = pixels.split_at_mut((height - 1 - y) * row);
        top[y * row..(y + 1) * row].swap_with_slice(&mut bottom[..row]);
    }
}
`),
	fn('fill_rect', 'Write `pub fn fill_rect(pixels: &mut [u8], width: usize, height: usize, x0: usize, y0: usize, w: usize, h: usize, color: [u8; 4])` that paints a rectangle on an RGBA canvas (4 bytes per pixel, row by row). The part of the rectangle outside the canvas is ignored.',
		'let mut p = [0u8; 2 * 2 * 4]; fill_rect(&mut p, 2, 2, 1, 0, 5, 1, [9, 8, 7, 6]); assert_eq!(p, [0, 0, 0, 0, 9, 8, 7, 6, 0, 0, 0, 0, 0, 0, 0, 0]); fill_rect(&mut p, 2, 2, 0, 1, 1, 9, [1, 2, 3, 4]); assert_eq!(&p[8..12], &[1, 2, 3, 4]); assert_eq!(&p[12..], &[0, 0, 0, 0]); fill_rect(&mut p, 2, 2, 7, 7, 2, 2, [5, 5, 5, 5]); assert_eq!(&p[..4], &[0, 0, 0, 0]);', R`
pub fn fill_rect(pixels: &mut [u8], width: usize, height: usize, x0: usize, y0: usize, w: usize, h: usize, color: [u8; 4]) {
    for y in y0..(y0 + h).min(height) {
        for x in x0..(x0 + w).min(width) {
            let i = (y * width + x) * 4;
            pixels[i..i + 4].copy_from_slice(&color);
        }
    }
}
`),
	fn('alpha_bounds', 'Write `pub fn alpha_bounds(pixels: &[u8], width: usize, height: usize) -> Option<(usize, usize, usize, usize)>` that finds the bounding box of the pixels that are not fully transparent in an RGBA image (alpha is the fourth byte of each pixel). Return (left, top, right, bottom), all inclusive, or None when every pixel is transparent.',
		'let mut p = vec![0u8; 4 * 3 * 4]; assert_eq!(alpha_bounds(&p, 4, 3), None); p[(1 * 4 + 2) * 4 + 3] = 10; assert_eq!(alpha_bounds(&p, 4, 3), Some((2, 1, 2, 1))); p[(2 * 4 + 0) * 4 + 3] = 255; assert_eq!(alpha_bounds(&p, 4, 3), Some((0, 1, 2, 2)));', R`
pub fn alpha_bounds(pixels: &[u8], width: usize, height: usize) -> Option<(usize, usize, usize, usize)> {
    let mut bounds: Option<(usize, usize, usize, usize)> = None;
    for y in 0..height {
        for x in 0..width {
            if pixels[(y * width + x) * 4 + 3] == 0 {
                continue;
            }
            bounds = Some(match bounds {
                None => (x, y, x, y),
                Some((left, top, right, bottom)) => (left.min(x), top.min(y), right.max(x), bottom.max(y)),
            });
        }
    }
    bounds
}
`),
	fn('mix_saturating', 'Write `pub fn mix(a: &[i16], b: &[i16]) -> Vec<i16>` that adds two audio tracks sample by sample without wrapping around: sums beyond the range of i16 stay at the limit. The result has the length of the longer track; where one has ended, the other passes unchanged.',
		'assert_eq!(mix(&[1, 2, 3], &[10, 20]), vec![11, 22, 3]); assert_eq!(mix(&[30000, -30000], &[10000, -10000]), vec![32767, -32768]); assert_eq!(mix(&[], &[5]), vec![5]); assert!(mix(&[], &[]).is_empty());', R`
pub fn mix(a: &[i16], b: &[i16]) -> Vec<i16> {
    let len = a.len().max(b.len());
    (0..len)
        .map(|n| {
            let x = a.get(n).copied().unwrap_or(0);
            let y = b.get(n).copied().unwrap_or(0);
            x.saturating_add(y)
        })
        .collect()
}
`),
	fn('euclid_rhythm', 'Write `pub fn euclid(steps: usize, pulses: usize) -> Vec<bool>` that spreads `pulses` hits as evenly as possible over `steps` steps (a Euclidean rhythm): step n is a hit when (n * pulses) % steps < pulses. More pulses than steps means every step is a hit.',
		'assert_eq!(euclid(8, 3), vec![true, false, false, true, false, false, true, false]); assert_eq!(euclid(4, 4), vec![true; 4]); assert_eq!(euclid(4, 9), vec![true; 4]); assert_eq!(euclid(5, 0), vec![false; 5]); assert_eq!(euclid(8, 2), vec![true, false, false, false, true, false, false, false]); assert!(euclid(0, 3).is_empty());', R`
pub fn euclid(steps: usize, pulses: usize) -> Vec<bool> {
    let pulses = pulses.min(steps);
    (0..steps).map(|n| (n * pulses) % steps < pulses).collect()
}
`),
	fn('quantize', 'Write `pub fn quantize(frame: u64, grid: u64) -> u64` that moves a position in time to the nearest multiple of grid (halfway goes up). A grid of 0 leaves the position as it is.',
		'assert_eq!(quantize(1000, 480), 960); assert_eq!(quantize(1200, 480), 1440); assert_eq!(quantize(239, 480), 0); assert_eq!(quantize(240, 480), 480); assert_eq!(quantize(77, 0), 77); assert_eq!(quantize(960, 480), 960);', R`
pub fn quantize(frame: u64, grid: u64) -> u64 {
    if grid == 0 {
        return frame;
    }
    (frame + grid / 2) / grid * grid
}
`),
	fn('hsv_to_rgb', 'Write `pub fn hsv_to_rgb(h: f32, s: f32, v: f32) -> (u8, u8, u8)` that converts a colour from HSV (h in degrees 0..360, s and v in 0..=1) to RGB bytes, rounding each channel.',
		'assert_eq!(hsv_to_rgb(0.0, 1.0, 1.0), (255, 0, 0)); assert_eq!(hsv_to_rgb(120.0, 1.0, 1.0), (0, 255, 0)); assert_eq!(hsv_to_rgb(240.0, 1.0, 0.5), (0, 0, 128)); assert_eq!(hsv_to_rgb(60.0, 1.0, 1.0), (255, 255, 0)); assert_eq!(hsv_to_rgb(200.0, 0.0, 1.0), (255, 255, 255)); assert_eq!(hsv_to_rgb(300.0, 0.5, 1.0), (255, 128, 255));', R`
pub fn hsv_to_rgb(h: f32, s: f32, v: f32) -> (u8, u8, u8) {
    let c = v * s;
    let sector = (h / 60.0) % 6.0;
    let x = c * (1.0 - (sector % 2.0 - 1.0).abs());
    let (r, g, b) = match sector as u32 {
        0 => (c, x, 0.0),
        1 => (x, c, 0.0),
        2 => (0.0, c, x),
        3 => (0.0, x, c),
        4 => (x, 0.0, c),
        _ => (c, 0.0, x),
    };
    let m = v - c;
    let byte = |value: f32| ((value + m) * 255.0).round() as u8;
    (byte(r), byte(g), byte(b))
}
`),
	fn('export_counter', 'Write two functions exported to the WebAssembly host with the C ABI and unmangled names: `tick() -> u32`, which adds one to a counter kept in a static and returns the new value, and `reset()`, which sets it back to 0. Use an atomic for the static, no unsafe code besides the attribute.',
		'reset(); assert_eq!(tick(), 1); assert_eq!(tick(), 2); reset(); assert_eq!(tick(), 1);', R`
use std::sync::atomic::{AtomicU32, Ordering};

static COUNT: AtomicU32 = AtomicU32::new(0);

#[unsafe(no_mangle)]
pub extern "C" fn tick() -> u32 {
    COUNT.fetch_add(1, Ordering::Relaxed) + 1
}

#[unsafe(no_mangle)]
pub extern "C" fn reset() {
    COUNT.store(0, Ordering::Relaxed);
}
`),
	fn('triangle_wave', 'Write `pub fn triangle(n: u32, period: u32) -> u32` that returns a triangle wave over the integers: it goes up from 0 to period and back down to 0, repeating every 2 * period steps. A period of 0 gives 0.',
		'assert_eq!((0..9).map(|n| triangle(n, 3)).collect::<Vec<_>>(), vec![0, 1, 2, 3, 2, 1, 0, 1, 2]); assert_eq!(triangle(250, 100), 50); assert_eq!(triangle(5, 0), 0); assert_eq!(triangle(100, 100), 100);', R`
pub fn triangle(n: u32, period: u32) -> u32 {
    if period == 0 {
        return 0;
    }
    let at = n % (2 * period);
    if at <= period { at } else { 2 * period - at }
}
`),

	tile('t_sunset', 'Write a tile program that fills the canvas with a vertical gradient from orange (255, 128, 0) at the top to dark purple (64, 0, 96) at the bottom, mixing the two linearly by the row. Alpha is 255.', R`
            let from = [255usize, 128, 0];
            let to = [64usize, 0, 96];
            for c in 0..3 {
                pixels[i + c] = ((from[c] * (height - 1 - y) + to[c] * y) / (height - 1)) as u8;
            }
            pixels[i + 3] = 255;
`),
	tile('t_dots', 'Write a tile program that draws a grid of white dots on a black background: a pixel is white when both x and y are multiples of 8. Alpha is 255.', R`
            let level = if x % 8 == 0 && y % 8 == 0 { 255 } else { 0 };
            pixels[i] = level;
            pixels[i + 1] = level;
            pixels[i + 2] = level;
            pixels[i + 3] = 255;
`),
	tile('t_plasma', 'Write a tile program that draws a moving plasma in shades of green: green is 128 + 127 * sin(x / 12 + y / 9 + t_ms / 400), red and blue are 0. Alpha is 255.', R`
            let wave = (x as f64 / 12.0 + y as f64 / 9.0 + t_ms as f64 / 400.0).sin();
            pixels[i] = 0;
            pixels[i + 1] = (128.0 + 127.0 * wave) as u8;
            pixels[i + 2] = 0;
            pixels[i + 3] = 255;
`),
	tile('t_scanline', 'Write a tile program with a black background and one white row that moves down with time: the row is (t_ms / 20) % height. Alpha is 255.', R`
            let row = (t_ms as usize / 20) % height;
            let level = if y == row { 255 } else { 0 };
            pixels[i] = level;
            pixels[i + 1] = level;
            pixels[i + 2] = level;
            pixels[i + 3] = 255;
`),
	tile('t_noise', 'Write a tile program that fills the canvas with gray static that does not change with time: the level of each pixel is the low byte of (x * 73 + y * 151) * 2654435761, computed in u32 with wrapping multiplication and shifted right by 24 bits. Alpha is 255.', R`
            let hash = ((x as u32 * 73 + y as u32 * 151).wrapping_mul(2654435761) >> 24) as u8;
            pixels[i] = hash;
            pixels[i + 1] = hash;
            pixels[i + 2] = hash;
            pixels[i + 3] = 255;
`),
	tile('t_radial', 'Write a tile program that draws a white glow in the centre fading to black: the gray level is 255 minus the distance from the centre of the canvas in pixels times 4, never below 0. Alpha is 255.', R`
            let dx = x as f64 - width as f64 / 2.0;
            let dy = y as f64 - height as f64 / 2.0;
            let level = (255.0 - (dx * dx + dy * dy).sqrt() * 4.0).max(0.0) as u8;
            pixels[i] = level;
            pixels[i + 1] = level;
            pixels[i + 2] = level;
            pixels[i + 3] = 255;
`),
	tile('t_marching', 'Write a tile program that draws diagonal stripes, 8 pixels of cyan (0, 255, 255) then 8 of black, that slide with time: a pixel is cyan when ((x + y + t_ms / 50) / 8) is even. Alpha is 255.', R`
            let on = ((x + y + t_ms as usize / 50) / 8) % 2 == 0;
            pixels[i] = 0;
            pixels[i + 1] = if on { 255 } else { 0 };
            pixels[i + 2] = if on { 255 } else { 0 };
            pixels[i + 3] = 255;
`),
	tile('t_ellipse', 'Write a tile program that draws a magenta (255, 0, 255) ellipse on a white background, centred, as wide as half the canvas and as tall as a quarter of it (so its radii are width / 4 and height / 8). Alpha is 255.', R`
            let dx = (x as f64 - width as f64 / 2.0) / (width as f64 / 4.0);
            let dy = (y as f64 - height as f64 / 2.0) / (height as f64 / 8.0);
            let inside = dx * dx + dy * dy <= 1.0;
            pixels[i] = 255;
            pixels[i + 1] = if inside { 0 } else { 255 };
            pixels[i + 2] = 255;
            pixels[i + 3] = 255;
`),
	tile('t_diamond', 'Write a tile program that draws a green diamond on a black background: a pixel is green (0, 255, 0) when its horizontal distance plus its vertical distance from the centre of the canvas is at most width / 3. Alpha is 255.', R`
            let dx = x.abs_diff(width / 2);
            let dy = y.abs_diff(height / 2);
            pixels[i] = 0;
            pixels[i + 1] = if dx + dy <= width / 3 { 255 } else { 0 };
            pixels[i + 2] = 0;
            pixels[i + 3] = 255;
`),
	tile('t_blink', 'Write a tile program that fills the whole canvas with one colour that changes every half second: red (255, 0, 0) while (t_ms / 500) is even, blue (0, 0, 255) while it is odd. Alpha is 255.', R`
            let red = (t_ms / 500) % 2 == 0;
            pixels[i] = if red { 255 } else { 0 };
            pixels[i + 1] = 0;
            pixels[i + 2] = if red { 0 } else { 255 };
            pixels[i + 3] = 255;
`),
	tile('t_wave', 'Write a tile program that draws a sine curve in yellow (255, 255, 0) on a dark blue (0, 0, 64) background: for each column, the curve is at the row height / 2 + (height / 4) * sin(x / 10), and the pixels within 1 row of it are yellow. Alpha is 255.', R`
            let curve = height as f64 / 2.0 + height as f64 / 4.0 * (x as f64 / 10.0).sin();
            let on = (y as f64 - curve).abs() <= 1.0;
            pixels[i] = if on { 255 } else { 0 };
            pixels[i + 1] = if on { 255 } else { 0 };
            pixels[i + 2] = if on { 0 } else { 64 };
            pixels[i + 3] = 255;
`),
	tile('t_corners', 'Write a tile program with a gray (128, 128, 128) background and a white square of 10 by 10 pixels in each of the four corners. Alpha is 255.', R`
            let near_side = x < 10 || x >= width - 10;
            let near_end = y < 10 || y >= height - 10;
            let level = if near_side && near_end { 255 } else { 128 };
            pixels[i] = level;
            pixels[i + 1] = level;
            pixels[i + 2] = level;
            pixels[i + 3] = 255;
`),
	tile('t_hue', 'Write a tile program that paints a rainbow from left to right with three sine waves a third of a turn apart: with a = x / width * 2π, red is 128 + 127 * sin(a), green is 128 + 127 * sin(a + 2π/3) and blue is 128 + 127 * sin(a + 4π/3). Alpha is 255.', R`
            let a = x as f64 / width as f64 * std::f64::consts::TAU;
            let third = std::f64::consts::TAU / 3.0;
            pixels[i] = (128.0 + 127.0 * a.sin()) as u8;
            pixels[i + 1] = (128.0 + 127.0 * (a + third).sin()) as u8;
            pixels[i + 2] = (128.0 + 127.0 * (a + 2.0 * third).sin()) as u8;
            pixels[i + 3] = 255;
`),
	tile('t_bounce', 'Write a tile program with a black background and a white square of 16 by 16 pixels, vertically centred, that slides from the left edge to the right edge and back: its left side is at a triangle wave of t_ms / 10 with period width - 16. Alpha is 255.', R`
            let span = width - 16;
            let at = (t_ms as usize / 10) % (2 * span);
            let left = if at <= span { at } else { 2 * span - at };
            let top = height / 2 - 8;
            let inside = x >= left && x < left + 16 && y >= top && y < top + 16;
            let level = if inside { 255 } else { 0 };
            pixels[i] = level;
            pixels[i + 1] = level;
            pixels[i + 2] = level;
            pixels[i + 3] = 255;
`),
	tile('t_mirror', 'Write a tile program that is symmetric about the vertical middle line: the red level grows from 0 at the left and right edges to its highest at the middle, as 255 * d / (width / 2) where d is the distance in pixels to the nearer side edge. Green and blue are 0, alpha is 255.', R`
            let d = x.min(width - 1 - x);
            pixels[i] = (255 * d / (width / 2)).min(255) as u8;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;
            pixels[i + 3] = 255;
`),
	tile('t_life_colors', 'Write a tile program that colours the canvas in cells of 16 by 16 pixels: the colour of a cell depends on (x / 16 + 2 * (y / 16)) % 3, which gives red (255, 0, 0) for 0, green (0, 255, 0) for 1 and blue (0, 0, 255) for 2. Alpha is 255.', R`
            let which = (x / 16 + 2 * (y / 16)) % 3;
            pixels[i] = if which == 0 { 255 } else { 0 };
            pixels[i + 1] = if which == 1 { 255 } else { 0 };
            pixels[i + 2] = if which == 2 { 255 } else { 0 };
            pixels[i + 3] = 255;
`),
];

// Ours first, then the ones brought from outside sources (import.mjs).
export const SEEDS = [...OWN, ...IMPORTED];
