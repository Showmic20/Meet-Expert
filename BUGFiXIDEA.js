function sumArray(numbers) {
  let sum = 0;

  for (let i = 0; i < numbers.length; i++) {
    sum += Number(numbers[i]);
  }

  return sum;
}

console.log(sumArray([1, "2", 3]));
